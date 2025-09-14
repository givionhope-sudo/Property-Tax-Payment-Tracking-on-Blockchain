# 🏠 Property Tax Payment Tracking on Blockchain

Welcome to a decentralized solution for tracking property tax payments using the Stacks blockchain! This project ensures transparency, compliance, and efficiency in property tax management for property owners and government authorities.

## ✨ Features
- 🏠 **Property Registration**: Register properties with unique identifiers and details.
- 💸 **Tax Payment Recording**: Record tax payments immutably on the blockchain.
- ✅ **Compliance Verification**: Verify if a property is tax-compliant instantly.
- 📅 **Payment History**: Access a complete, tamper-proof history of tax payments.
- 🚨 **Penalty Tracking**: Track penalties for late or missed payments.
- 🔒 **Secure Access Control**: Ensure only authorized parties (owners, government) access sensitive data.
- 📊 **Tax Reporting**: Generate compliance reports for properties or owners.
- 🔔 **Payment Reminders**: Flag properties with upcoming or overdue tax payments.

## 🛠 How It Works

### For Property Owners
1. Register your property with a unique ID, address, and owner details using the `property-registry` contract.
2. Submit tax payments via the `tax-payment` contract, specifying the property ID and amount.
3. View payment history or compliance status using the `tax-history` contract.
4. Receive notifications for upcoming or overdue payments through the `payment-reminder` contract.

### For Government Authorities
1. Verify property ownership and tax compliance using the `compliance-verifier` contract.
2. Record penalties for non-compliance via the `penalty-tracker` contract.
3. Generate tax compliance reports for auditing purposes with the `tax-reporting` contract.
4. Access registered property details securely using the `access-control` contract.

### For Verifiers (e.g., Auditors or Third Parties)
1. Use the `compliance-verifier` contract to check if a property has met tax obligations.
2. Retrieve immutable payment history from the `tax-history` contract for transparency.

## 📜 Smart Contracts
This project uses **8 Clarity smart contracts** to manage the property tax payment tracking system:

1. **property-registry.clar**: Registers properties with unique IDs, owner details, and property metadata (e.g., address, valuation).
2. **tax-payment.clar**: Records tax payments for a property, including amount, date, and payer.
3. **tax-history.clar**: Stores and retrieves the full payment history for a property.
4. **compliance-verifier.clar**: Verifies if a property is compliant based on payment history and due dates.
5. **penalty-tracker.clar**: Tracks penalties for late or missed tax payments.
6. **access-control.clar**: Manages permissions for who can view or update property and payment data.
7. **tax-reporting.clar**: Generates compliance reports for properties or owners.
8. **payment-reminder.clar**: Flags properties with upcoming or overdue tax payments.

## 🚀 Getting Started

### Prerequisites
- Stacks blockchain account with STX tokens.
- Clarity development environment (e.g., Clarinet).
- Basic understanding of Clarity smart contracts.

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/your-repo/property-tax-blockchain.git
   ```
2. Install Clarinet:
   ```bash
   npm install -g @hirosystems/clarinet
   ```
3. Deploy the contracts using Clarinet:
   ```bash
   clarinet deploy
   ```

### Usage
1. **Register a Property**:
   - Call `register-property` in `property-registry.clar` with property ID, owner principal, and details (e.g., address, valuation).
2. **Record a Payment**:
   - Use `record-payment` in `tax-payment.clar` to log a tax payment with property ID, amount, and timestamp.
3. **Check Compliance**:
   - Query `is-compliant` in `compliance-verifier.clar` to verify a property’s tax status.
4. **View Payment History**:
   - Call `get-payment-history` in `tax-history.clar` to retrieve all payments for a property.
5. **Generate Reports**:
   - Use `generate-report` in `tax-reporting.clar` to create compliance reports.

## 🛡️ Security and Transparency
- **Immutable Records**: All payments and penalties are stored on the Stacks blockchain, ensuring tamper-proof records.
- **Access Control**: Only authorized principals (owners, government) can modify or view sensitive data.
- **Auditability**: Third parties can verify compliance without accessing private data, ensuring transparency.

## 📚 Example Workflow
1. A property owner registers their property: `{ id: "PROP001", owner: "STX_ADDRESS", address: "123 Main St", valuation: 500000 }`.
2. They pay their annual tax of 5000 STX via `tax-payment.clar`.
3. The government checks compliance using `compliance-verifier.clar` and confirms the payment.
4. If a payment is missed, `penalty-tracker.clar` records a penalty, and `payment-reminder.clar` flags the overdue status.
5. An auditor generates a compliance report using `tax-reporting.clar` for all properties in a region.

## 🌟 Why Blockchain?
- **Transparency**: All transactions are publicly verifiable.
- **Efficiency**: Eliminates manual record-keeping and reduces errors.
- **Compliance**: Encourages timely payments with automated reminders and penalties.
- **Trust**: Immutable records build trust between property owners and governments.

## 📝 License
This project is licensed under the MIT License.
