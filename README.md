# n8n-nodes-perfexcrm

This is an n8n community node for interacting with Perfex CRM. It provides operations for managing Customers, Invoices, and Payments.

## Installation

### In n8n Desktop or Self-Hosted

1. Go to **Settings > Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-perfexcrm` and click **Install**

### Manual Installation

```bash
cd ~/.n8n/nodes
npm install /path/to/n8n-nodes-perfexcrm
```

### Development

```bash
npm install
npm run build
npm link

# In ~/.n8n/nodes directory:
npm link n8n-nodes-perfexcrm
```

## Credentials

This node uses the Perfex CRM API module. You need to:

1. Install the API module in your Perfex CRM
2. Generate an API token from the API module settings
3. Configure the credentials in n8n with:
   - **Base URL**: Your Perfex CRM URL (e.g., `https://your-perfexcrm.com`)
   - **API Token**: The JWT token from the API module

## Resources & Operations

### Customer

| Operation | Description | Output |
|-----------|-------------|--------|
| **Create** | Create a new customer with company details, address, and billing/shipping information | `customerId`, `status`, `message` |
| **Get** | Get a customer by ID | Customer details |
| **Get Many** | Get all customers with optional limit/sort | Customer list |
| **Search** | Search customers by company name, email, phone, etc. | Matching customers |
| **Update** | Update customer information | Update status |

#### Address Handling

When creating a customer, you can:
- Fill the main address and toggle **Copy to Billing Address** and/or **Copy to Shipping Address**
- Manually fill the Billing Address separately
- Manually fill the Shipping Address separately

### Invoice

| Operation | Description | Output |
|-----------|-------------|--------|
| **Create** | Create a new invoice with items, taxes, discounts, and custom fields | `invoiceId`, `invoiceNumber`, `clientid`, `status`, `message` |
| **Get** | Get an invoice by ID | Invoice details |
| **Get Many** | Get all invoices with filters (limit, sort, customer ID, status) | Invoice list |
| **Search** | Search invoices by number, customer name, etc. with limit/sort options | Matching invoices |
| **Get URL** | Get the customer-facing invoice URL | `invoiceId`, `invoiceNumber`, `hash`, `invoiceUrl` |
| **Get Admin URLs** | Get admin panel and PDF URLs | `invoiceId`, `invoiceNumber`, `adminUrl`, `pdfViewUrl`, `pdfDownloadUrl` |

#### Get Many Options

- **Limit**: Number of results to return (default: 50)
- **Sort By**: Sort by ID, Date, or Invoice Number (ascending/descending)
- **Customer ID**: Filter by customer
- **Status**: Filter by invoice status (Draft, Sent, Unpaid, Partially Paid, Paid, etc.)

#### Search Options

- **Limit**: Number of results to return (default: 50)
- **Sort By**: Sort by ID, Date, Invoice Number, or Total (ascending/descending)

#### Invoice Items

Each invoice item can include:
- Description and long description
- Quantity and rate
- Unit of measure
- Tax (in format `TaxName|TaxRate`, e.g., `KDV|20.00`)
- S/N (Serial Number) - custom field

#### Invoice Number Auto-Generation

If the Invoice Number field is left blank, the node will automatically get the last invoice number and increment by 1.

#### S/N Custom Field

The S/N (Serial Number) is a custom field on invoice items. The default custom field ID is `8`. If your installation uses a different ID, you can specify it in the node settings.

### Payment

| Operation | Description | Output |
|-----------|-------------|--------|
| **Create** | Record a new payment for an invoice | `paymentId`, `status`, `message` |
| **Get** | Get a payment by ID | Payment details |
| **Get Many** | Get all payments with limit, sort, query, and invoice ID filter | Payment list |
| **Search** | Search payments | Matching payments |

#### Get Many Options

- **Limit**: Number of results to return (default: 50)
- **Sort By**: Sort by ID, Date, or Amount (ascending/descending)
- **Search Query**: Filter by payment ID, transaction ID, or note
- **Invoice ID**: Filter payments by specific invoice

## URL Outputs

### Get URL (Customer-Facing)

Returns the public invoice URL that customers can access:
```
https://your-domain.com/invoice/{id}/{hash}
```

### Get Admin URLs

Returns admin panel URLs (requires admin authentication):

| URL | Description |
|-----|-------------|
| `adminUrl` | Direct link to invoice in admin panel: `https://your-domain.com/admin/invoices/list_invoices/{id}#{id}` |
| `pdfViewUrl` | View PDF in browser: `https://your-domain.com/admin/invoices/pdf/{id}?output_type=I` |
| `pdfDownloadUrl` | Download PDF: `https://your-domain.com/admin/invoices/pdf/{id}` |

## API Endpoints Used

| Resource | Endpoint | Methods |
|----------|----------|---------|
| Customers | `/api/customers` | GET, POST, PUT |
| Invoices | `/api/invoices` | GET, POST |
| Payments | `/api/payments` | GET, POST |
| Search | `/api/{resource}/search/{query}` | GET |

## Authentication

The node uses JWT authentication with the `authtoken` header. The token is generated by the Perfex CRM API module and should be configured in the n8n credentials.

## Example Workflows

### Create Customer and Invoice

1. **Perfex CRM** (Customer: Create)
   - Company: `{{ $json.company_name }}`
   - Address: Copy to Billing
   - **Output**: `customerId`

2. **Perfex CRM** (Invoice: Create)
   - Customer ID: `{{ $json.customerId }}`
   - Items: Add your products
   - **Output**: `invoiceId`

3. **Perfex CRM** (Invoice: Get URL)
   - Invoice ID: `{{ $json.invoiceId }}`
   - **Output**: `invoiceUrl` (send to customer)

### Record Payment

1. **Perfex CRM** (Invoice: Search)
   - Find the invoice

2. **Perfex CRM** (Payment: Create)
   - Invoice ID: `{{ $json.id }}`
   - Amount: `{{ $json.total }}`
   - Payment Mode: `12` (or your payment mode ID)
   - **Output**: `paymentId`

### Get Admin Links

1. **Perfex CRM** (Invoice: Get Admin URLs)
   - Invoice ID: `{{ $json.invoiceId }}`
   - **Output**: `adminUrl`, `pdfViewUrl`, `pdfDownloadUrl`

## Country Codes

Common country codes used in Perfex CRM:
- Turkey: `228`
- United States: `231`
- United Kingdom: `230`

## Currency Codes

Common currency codes:
- TRY (Turkish Lira): `3`
- USD: `1`
- EUR: `2`

## License

MIT

## Author

Ömer Vehbe (ovehbe@gmail.com)
