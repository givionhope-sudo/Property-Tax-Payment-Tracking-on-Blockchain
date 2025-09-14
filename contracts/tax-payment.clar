(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PROPERTY-ID u101)
(define-constant ERR-INVALID-AMOUNT u102)
(define-constant ERR-INVALID-TIMESTAMP u103)
(define-constant ERR-PAYMENT-ALREADY-EXISTS u104)
(define-constant ERR-PROPERTY-NOT-FOUND u105)
(define-constant ERR-INSUFFICIENT-FUNDS u106)
(define-constant ERR-PAYMENT-EXCEEDS-DUE u107)
(define-constant ERR-OVERPAYMENT-NOT-ALLOWED u108)
(define-constant ERR-PAYMENT-WINDOW-CLOSED u109)
(define-constant ERR-INVALID-CURRENCY u110)
(define-constant ERR-TRANSFER-FAILED u111)
(define-constant ERR-COMPLIANCE-UPDATE-FAILED u112)
(define-constant ERR-HISTORY-LOG-FAILED u113)
(define-constant ERR-REGISTRY-CHECK-FAILED u114)
(define-data-var payment-counter uint u0)
(define-data-var payment-fee uint u50)
(define-data-var authority-contract (optional principal) none)
(define-map payments
  { payment-id: uint }
  {
    property-id: (string-ascii 34),
    payer: principal,
    amount: uint,
    timestamp: uint,
    currency: (string-ascii 3),
    due-date: uint,
    status: bool
  }
)
(define-map property-payments
  { property-id: (string-ascii 34) }
  {
    total-paid: uint,
    last-payment: uint,
    payment-count: uint,
    is-compliant: bool
  }
)
(define-map payment-fees
  { property-id: (string-ascii 34) }
  { fee-paid: uint, fee-timestamp: uint }
)
(define-read-only (get-payment (payment-id uint))
  (map-get? payments { payment-id: payment-id })
)
(define-read-only (get-property-payments (property-id (string-ascii 34)))
  (map-get? property-payments { property-id: property-id })
)
(define-read-only (get-payment-fees (property-id (string-ascii 34)))
  (map-get? payment-fees { property-id: property-id })
)
(define-read-only (get-payment-count)
  (ok (var-get payment-counter))
)
(define-private (validate-property-id (pid (string-ascii 34)))
  (if (and (> (len pid) u0) (<= (len pid) u34))
      (ok true)
      (err ERR-INVALID-PROPERTY-ID))
)
(define-private (validate-amount (amt uint))
  (if (> amt u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)
(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)
(define-private (validate-currency (cur (string-ascii 3)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)
(define-private (validate-payment-window (due uint))
  (if (<= block-height due)
      (ok true)
      (err ERR-PAYMENT-WINDOW-CLOSED))
)
(define-private (check-property-exists (pid (string-ascii 34)))
  (contract-call? .property-registry property-exists pid)
)
(define-private (log-payment-history (pid (string-ascii 34)) (pay-id uint) (amt uint) (ts uint))
  (contract-call? .tax-history log-payment pid pay-id amt ts)
)
(define-private (update-compliance (pid (string-ascii 34)))
  (contract-call? .compliance-verifier update-status pid)
)
(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender 'SP000000000000000000002Q6VF78) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)
(define-public (set-payment-fee (new-fee uint))
  (begin
    (asserts! (is-some (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= new-fee u0) (err ERR-INVALID-AMOUNT))
    (var-set payment-fee new-fee)
    (ok true)
  )
)
(define-public (record-payment
  (property-id (string-ascii 34))
  (amount uint)
  (currency (string-ascii 3))
  (due-date uint)
)
  (let
    (
      (payment-id (var-get payment-counter))
      (current-time (block-height))
      (authority (unwrap! (var-get authority-contract) (err ERR-NOT-AUTHORIZED)))
    )
    (try! (validate-property-id property-id))
    (try! (validate-amount amount))
    (try! (validate-currency currency))
    (try! (validate-payment-window due-date))
    (try! (check-property-exists property-id))
    (asserts! (is-none (map-get? payments { payment-id: payment-id })) (err ERR-PAYMENT-ALREADY-EXISTS))
    (let ((prop-payments (map-get? property-payments { property-id: property-id })))
      (match prop-payments
        pp
          (begin
            (map-set property-payments { property-id: property-id }
              {
                total-paid: (+ (get total-paid pp) amount),
                last-payment: current-time,
                payment-count: (+ (get payment-count pp) u1),
                is-compliant: true
              }
            )
          )
        (begin
          (map-insert property-payments { property-id: property-id }
            {
              total-paid: amount,
              last-payment: current-time,
              payment-count: u1,
              is-compliant: true
            }
          )
        )
      )
    )
    (map-insert payments { payment-id: payment-id }
      {
        property-id: property-id,
        payer: tx-sender,
        amount: amount,
        timestamp: current-time,
        currency: currency,
        due-date: due-date,
        status: true
      }
    )
    (map-insert payment-fees { property-id: property-id }
      {
        fee-paid: (var-get payment-fee),
        fee-timestamp: current-time
      }
    )
    (try! (stx-transfer? (var-get payment-fee) tx-sender authority))
    (try! (log-payment-history property-id payment-id amount current-time))
    (try! (update-compliance property-id))
    (var-set payment-counter (+ payment-id u1))
    (print { event: "payment-recorded", id: payment-id, property: property-id })
    (ok payment-id)
  )
)
(define-public (refund-payment (payment-id uint))
  (let ((payment (map-get? payments { payment-id: payment-id })))
    (match payment
      p
        (begin
          (asserts! (is-eq (get payer p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (get status p) (err ERR-NOT-AUTHORIZED))
          (let ((prop-id (get property-id p)))
            (let ((prop-payments (map-get? property-payments { property-id: prop-id })))
              (match prop-payments
                pp
                  (if (> (get total-paid pp) (get amount p))
                      (map-set property-payments { property-id: prop-id }
                        {
                          total-paid: (- (get total-paid pp) (get amount p)),
                          last-payment: (get last-payment pp),
                          payment-count: (- (get payment-count pp) u1),
                          is-compliant: (if (> (- (get total-paid pp) (get amount p)) u0) true false)
                        }
                      )
                      (map-delete property-payments { property-id: prop-id })
                  )
                ok
              )
            )
          )
          (map-set payments { payment-id: payment-id }
            { property-id: (get property-id p), payer: (get payer p), amount: (get amount p), timestamp: (get timestamp p), currency: (get currency p), due-date: (get due-date p), status: false }
          )
          (try! (stx-transfer? (get amount p) 'SP000000000000000000002Q6VF78 tx-sender))
          (print { event: "payment-refunded", id: payment-id })
          (ok true)
        )
      (err ERR-PAYMENT-ALREADY-EXISTS)
    )
  )
)
(define-public (check-payment-status (payment-id uint))
  (ok (unwrap! (get-payment payment-id) ERR-PAYMENT-ALREADY-EXISTS))
)