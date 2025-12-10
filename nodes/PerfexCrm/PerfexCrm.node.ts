import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import {
	perfexCrmApiRequest,
	perfexCrmApiRequestAllItems,
	buildAddressData,
	calculateInvoiceTotals,
} from './GenericFunctions';

export class PerfexCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Perfex CRM',
		name: 'perfexCrm',
		icon: 'file:perfexcrm.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Perfex CRM API - Customers, Invoices, and Payments',
		defaults: {
			name: 'Perfex CRM',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'perfexCrmApi',
				required: true,
			},
		],
		properties: [
			// Resource Selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Payment',
						value: 'payment',
					},
				],
				default: 'customer',
			},

			// ============ CUSTOMER OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['customer'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new customer',
						action: 'Create a customer',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a customer by ID',
						action: 'Get a customer',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get all customers',
						action: 'Get many customers',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search customers',
						action: 'Search customers',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a customer',
						action: 'Update a customer',
					},
				],
				default: 'get',
			},

			// Customer ID (for Get, Update)
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['get', 'update'],
					},
				},
				default: '',
				description: 'The ID of the customer',
			},

			// Search Query
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['search'],
					},
				},
				default: '',
				description: 'Search query to find customers (company name, email, phone, etc.)',
			},

			// Customer Create Fields
			{
				displayName: 'Company Name',
				name: 'company',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Company name of the customer',
			},

			// Customer Additional Fields (Create)
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'VAT Number',
						name: 'vat',
						type: 'string',
						default: '',
						description: 'VAT number of the customer',
					},
					{
						displayName: 'Phone Number',
						name: 'phonenumber',
						type: 'string',
						default: '',
						description: 'Phone number',
					},
					{
						displayName: 'Website/Email',
						name: 'website',
						type: 'string',
						default: '',
						description: 'Website or email address',
					},
					{
						displayName: 'Default Currency ID',
						name: 'default_currency',
						type: 'string',
						default: '',
						description: 'Currency ID (e.g., 3 for TRY)',
					},
					{
						displayName: 'Default Language',
						name: 'default_language',
						type: 'string',
						default: '',
						description: 'Default language (e.g., english, turkish)',
					},
					{
						displayName: 'Country ID',
						name: 'country',
						type: 'string',
						default: '',
						description: 'Country ID (e.g., 228 for Turkey)',
					},
				],
			},

			// Address Fields (Create Customer)
			{
				displayName: 'Address',
				name: 'addressFields',
				type: 'collection',
				placeholder: 'Add Address',
				default: {},
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Street Address',
						name: 'address',
						type: 'string',
						default: '',
						description: 'Street address',
					},
					{
						displayName: 'Province/State',
						name: 'state',
						type: 'string',
						default: '',
						description: 'Province or state',
					},
					{
						displayName: 'District/City',
						name: 'city',
						type: 'string',
						default: '',
						description: 'District or city',
					},
					{
						displayName: 'Zip Code',
						name: 'zip',
						type: 'string',
						default: '',
						description: 'Zip/postal code',
					},
					{
						displayName: 'Copy to Billing Address',
						name: 'copyToBilling',
						type: 'boolean',
						default: true,
						description: 'Whether to copy address to billing address',
					},
					{
						displayName: 'Copy to Shipping Address',
						name: 'copyToShipping',
						type: 'boolean',
						default: false,
						description: 'Whether to copy address to shipping address',
					},
				],
			},

			// Manual Billing Address (when not copying)
			{
				displayName: 'Billing Address',
				name: 'billingAddress',
				type: 'collection',
				placeholder: 'Add Billing Address',
				default: {},
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Street',
						name: 'billing_street',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Province/State',
						name: 'billing_state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'District/City',
						name: 'billing_city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip Code',
						name: 'billing_zip',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country ID',
						name: 'billing_country',
						type: 'string',
						default: '',
					},
				],
			},

			// Shipping Address (optional)
			{
				displayName: 'Shipping Address',
				name: 'shippingAddress',
				type: 'collection',
				placeholder: 'Add Shipping Address',
				default: {},
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Street',
						name: 'shipping_street',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Province/State',
						name: 'shipping_state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'District/City',
						name: 'shipping_city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip Code',
						name: 'shipping_zip',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country ID',
						name: 'shipping_country',
						type: 'string',
						default: '',
					},
				],
			},

			// Customer Get Many Options
			{
				displayName: 'Options',
				name: 'customerGetAllOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						description: 'Max number of results to return',
					},
					{
						displayName: 'Filter by Phone Number',
						name: 'phonenumber',
						type: 'string',
						default: '',
						description: 'Filter customers by phone number (partial match)',
					},
					{
						displayName: 'Filter by VAT',
						name: 'vat',
						type: 'string',
						default: '',
						description: 'Filter customers by VAT number (partial match)',
					},
					{
						displayName: 'Sort By',
						name: 'sortBy',
						type: 'options',
						options: [
							{ name: 'ID (Newest First)', value: 'id_desc' },
							{ name: 'ID (Oldest First)', value: 'id_asc' },
							{ name: 'Company Name (A-Z)', value: 'company_asc' },
							{ name: 'Company Name (Z-A)', value: 'company_desc' },
							{ name: 'Date Created (Newest First)', value: 'datecreated_desc' },
							{ name: 'Date Created (Oldest First)', value: 'datecreated_asc' },
						],
						default: 'id_desc',
						description: 'Sort order for results',
					},
				],
			},

			// Customer Update Fields
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Company Name',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'VAT Number',
						name: 'vat',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Phone Number',
						name: 'phonenumber',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Website/Email',
						name: 'website',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Street Address',
						name: 'address',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Province/State',
						name: 'state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'District/City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Zip Code',
						name: 'zip',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country ID',
						name: 'country',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing Street',
						name: 'billing_street',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing Province/State',
						name: 'billing_state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing District/City',
						name: 'billing_city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing Zip',
						name: 'billing_zip',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing Country ID',
						name: 'billing_country',
						type: 'string',
						default: '',
					},
				],
			},

			// ============ INVOICE OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new invoice',
						action: 'Create an invoice',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get an invoice by ID',
						action: 'Get an invoice',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get all invoices',
						action: 'Get many invoices',
					},
					{
						name: 'Get Admin URLs',
						value: 'getAdminUrls',
						description: 'Get admin panel and PDF URLs',
						action: 'Get admin URLs',
					},
					{
						name: 'Get URL',
						value: 'getUrl',
						description: 'Get customer-facing invoice URL',
						action: 'Get invoice URL',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search invoices',
						action: 'Search invoices',
					},
				],
				default: 'get',
			},

			// Invoice ID
			{
				displayName: 'Invoice ID',
				name: 'invoiceId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['get', 'getUrl', 'getAdminUrls'],
					},
				},
				default: '',
				description: 'The ID of the invoice',
			},

			// Invoice Search Query
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['search'],
					},
				},
				default: '',
				description: 'Search query to find invoices (invoice number, customer name, etc.)',
			},

			// Invoice Get Many Options
			{
				displayName: 'Options',
				name: 'invoiceGetAllOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						description: 'Max number of results to return',
					},
					{
						displayName: 'Customer ID',
						name: 'clientid',
						type: 'string',
						default: '',
						description: 'Filter by customer ID',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'All', value: '' },
							{ name: 'Unpaid', value: '1' },
							{ name: 'Paid', value: '2' },
							{ name: 'Partially Paid', value: '3' },
							{ name: 'Overdue', value: '4' },
							{ name: 'Cancelled', value: '5' },
							{ name: 'Draft', value: '6' },
						],
						default: '',
						description: 'Filter by invoice status',
					},
					{
						displayName: 'Sort By',
						name: 'sortBy',
						type: 'options',
						options: [
							{ name: 'ID (Newest First)', value: 'id_desc' },
							{ name: 'ID (Oldest First)', value: 'id_asc' },
							{ name: 'Date (Newest First)', value: 'date_desc' },
							{ name: 'Date (Oldest First)', value: 'date_asc' },
							{ name: 'Number (Highest First)', value: 'number_desc' },
							{ name: 'Number (Lowest First)', value: 'number_asc' },
						],
						default: 'id_desc',
						description: 'Sort order for results',
					},
				],
			},

			// Invoice Create - Customer ID
			{
				displayName: 'Customer ID',
				name: 'clientid',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The ID of the customer',
			},

			// Invoice Create - Date
			{
				displayName: 'Invoice Date',
				name: 'date',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
					},
				},
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Invoice date in YYYY-MM-DD format',
			},

			// Invoice Create - Currency
			{
				displayName: 'Currency ID',
				name: 'currency',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
					},
				},
				default: '3',
				description: 'Currency ID (e.g., 3 for TRY)',
			},

			// Invoice Create - Billing Street
			{
				displayName: 'Billing Street',
				name: 'billing_street',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Billing address street (required)',
			},

			// Invoice Create - Set Payment Modes Toggle
			{
				displayName: 'Set Payment Modes',
				name: 'setPaymentModes',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether to set allowed payment modes for this invoice',
			},

			// Invoice Create - Payment Modes (conditional)
			{
				displayName: 'Payment Modes',
				name: 'allowed_payment_modes',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
						setPaymentModes: [true],
					},
				},
				default: '',
				placeholder: '1,2,3',
				description: 'Comma-separated payment mode IDs',
			},

			// Invoice Items
			{
				displayName: 'Items',
				name: 'items',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
					},
				},
				default: {},
				options: [
					{
						name: 'itemValues',
						displayName: 'Item',
						values: [
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'Item description/name',
								required: true,
							},
							{
								displayName: 'Long Description',
								name: 'longDescription',
								type: 'string',
								default: '',
								description: 'Detailed description',
							},
							{
								displayName: 'Quantity',
								name: 'quantity',
								type: 'number',
								default: 1,
								description: 'Quantity',
							},
							{
								displayName: 'Rate',
								name: 'rate',
								type: 'number',
								default: 0,
								description: 'Unit price',
							},
							{
								displayName: 'Unit',
								name: 'unit',
								type: 'string',
								default: '',
								description: 'Unit of measure',
							},
							{
								displayName: 'Tax (Name|Rate)',
								name: 'taxName',
								type: 'string',
								default: '',
								placeholder: 'KDV|20.00',
								description: 'Tax in format TaxName|TaxRate',
							},
							{
								displayName: 'S/N (Serial Number)',
								name: 'serialNumber',
								type: 'string',
								default: '',
								description: 'Serial number custom field value',
							},
						],
					},
				],
			},

			// Invoice Additional Fields
			{
				displayName: 'Additional Fields',
				name: 'invoiceAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['invoice'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Invoice Number',
						name: 'number',
						type: 'string',
						default: '',
						description: 'Invoice number (leave empty to auto-generate)',
					},
					{
						displayName: 'Due Date',
						name: 'duedate',
						type: 'string',
						default: '',
						placeholder: 'YYYY-MM-DD',
						description: 'Due date in YYYY-MM-DD format',
					},
					{
						displayName: 'Sale Agent ID',
						name: 'sale_agent',
						type: 'string',
						default: '',
						description: 'Staff ID of the sale agent',
					},
					{
						displayName: 'Discount Percent',
						name: 'discount_percent',
						type: 'number',
						default: 0,
						description: 'Discount percentage',
					},
					{
						displayName: 'Discount Total',
						name: 'discount_total',
						type: 'number',
						default: 0,
						description: 'Fixed discount amount',
					},
					{
						displayName: 'Discount Type',
						name: 'discount_type',
						type: 'options',
						options: [
							{ name: 'None', value: '' },
							{ name: 'Before Tax', value: 'before_tax' },
							{ name: 'After Tax', value: 'after_tax' },
						],
						default: '',
					},
					{
						displayName: 'Adjustment',
						name: 'adjustment',
						type: 'number',
						default: 0,
						description: 'Price adjustment',
					},
					{
						displayName: 'Admin Note',
						name: 'adminnote',
						type: 'string',
						default: '',
						description: 'Admin notes (internal)',
					},
					{
						displayName: 'Client Note',
						name: 'clientnote',
						type: 'string',
						default: '',
						description: 'Note visible to client',
					},
					{
						displayName: 'Terms',
						name: 'terms',
						type: 'string',
						default: '',
						description: 'Invoice terms and conditions',
					},
					{
						displayName: 'Billing City',
						name: 'billing_city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing State',
						name: 'billing_state',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing Zip',
						name: 'billing_zip',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Billing Country ID',
						name: 'billing_country',
						type: 'string',
						default: '',
					},
					{
						displayName: 'S/N Custom Field ID',
						name: 'snFieldId',
						type: 'string',
						default: '8',
						description: 'The ID of the S/N custom field for items',
					},
					{
						displayName: 'Custom Fields',
						name: 'customFields',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						description: 'Add invoice-level custom fields (e.g., İlk Temsilci, Arif\'in Notu, Arif Platform)',
						options: [
							{
								name: 'customFieldValues',
								displayName: 'Custom Field',
								values: [
									{
										displayName: 'Field ID',
										name: 'fieldId',
										type: 'string',
										default: '',
										description: 'The custom field ID (e.g., 9, 10, 11)',
										required: true,
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'The value for this custom field',
									},
								],
							},
						],
					},
				],
			},

			// ============ PAYMENT OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['payment'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Record a new payment',
						action: 'Create a payment',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a payment by ID',
						action: 'Get a payment',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get all payments',
						action: 'Get many payments',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search payments',
						action: 'Search payments',
					},
				],
				default: 'get',
			},

			// Payment ID
			{
				displayName: 'Payment ID',
				name: 'paymentId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['get'],
					},
				},
				default: '',
				description: 'The ID of the payment',
			},

			// Payment Search Query
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['search'],
					},
				},
				default: '',
				description: 'Search query to find payments',
			},

			// Payment Create - Invoice ID
			{
				displayName: 'Invoice ID',
				name: 'invoiceid',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The ID of the invoice to record payment for',
			},

			// Payment Create - Amount
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['create'],
					},
				},
				default: 0,
				description: 'Payment amount',
			},

			// Payment Create - Payment Mode
			{
				displayName: 'Payment Mode ID',
				name: 'paymentmode',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Payment mode ID',
			},

			// Payment Additional Fields
			{
				displayName: 'Additional Fields',
				name: 'paymentAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Date',
						name: 'date',
						type: 'string',
						default: '',
						placeholder: 'YYYY-MM-DD',
						description: 'Payment date (defaults to today)',
					},
					{
						displayName: 'Note',
						name: 'note',
						type: 'string',
						default: '',
						description: 'Payment note',
					},
					{
						displayName: 'Transaction ID',
						name: 'transactionid',
						type: 'string',
						default: '',
						description: 'Transaction reference ID',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};
				const credentials = await this.getCredentials('perfexCrmApi');
				const baseUrl = credentials.baseUrl as string;

				// ============ CUSTOMER ============
				if (resource === 'customer') {
					if (operation === 'get') {
						const customerId = this.getNodeParameter('customerId', i) as string;
						responseData = await perfexCrmApiRequest.call(this, 'GET', `/customers/${customerId}`);
					}

					if (operation === 'getAll') {
						const options = this.getNodeParameter('customerGetAllOptions', i) as IDataObject;
						let allCustomers = await perfexCrmApiRequestAllItems.call(this, 'GET', '/customers') as IDataObject[];
						
						// Filter by phone number if provided
						if (options.phonenumber) {
							const phoneFilter = (options.phonenumber as string).toLowerCase();
							allCustomers = allCustomers.filter(customer => 
								customer.phonenumber && (customer.phonenumber as string).toLowerCase().includes(phoneFilter)
							);
						}
						
						// Filter by VAT if provided
						if (options.vat) {
							const vatFilter = (options.vat as string).toLowerCase();
							allCustomers = allCustomers.filter(customer => 
								customer.vat && (customer.vat as string).toLowerCase().includes(vatFilter)
							);
						}
						
						// Sort results
						const sortBy = (options.sortBy as string) || 'id_desc';
						allCustomers.sort((a, b) => {
							switch (sortBy) {
								case 'id_asc':
									return parseInt(a.userid as string, 10) - parseInt(b.userid as string, 10);
								case 'id_desc':
									return parseInt(b.userid as string, 10) - parseInt(a.userid as string, 10);
								case 'company_asc':
									return (a.company as string || '').localeCompare(b.company as string || '');
								case 'company_desc':
									return (b.company as string || '').localeCompare(a.company as string || '');
								case 'datecreated_asc':
									return new Date(a.datecreated as string).getTime() - new Date(b.datecreated as string).getTime();
								case 'datecreated_desc':
									return new Date(b.datecreated as string).getTime() - new Date(a.datecreated as string).getTime();
								default:
									return parseInt(b.userid as string, 10) - parseInt(a.userid as string, 10);
							}
						});
						
						// Apply limit
						const limit = (options.limit as number) || 50;
						responseData = allCustomers.slice(0, limit);
					}

					if (operation === 'search') {
						const searchQuery = this.getNodeParameter('searchQuery', i) as string;
						responseData = await perfexCrmApiRequestAllItems.call(
							this,
							'GET',
							`/customers/search/${encodeURIComponent(searchQuery)}`,
						);
					}

					if (operation === 'create') {
						const company = this.getNodeParameter('company', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const addressFields = this.getNodeParameter('addressFields', i) as IDataObject;
						const billingAddress = this.getNodeParameter('billingAddress', i) as IDataObject;
						const shippingAddress = this.getNodeParameter('shippingAddress', i) as IDataObject;

						const body: IDataObject = {
							company,
							...additionalFields,
						};

						// Handle address with copy options
						if (addressFields && Object.keys(addressFields).length > 0) {
							const copyToBilling = addressFields.copyToBilling as boolean;
							const copyToShipping = addressFields.copyToShipping as boolean;
							const country = additionalFields.country as string || '';

							const addressData = buildAddressData(
								addressFields.address as string || '',
								addressFields.city as string || '',
								addressFields.state as string || '',
								addressFields.zip as string || '',
								country,
								copyToBilling,
								copyToShipping,
							);

							Object.assign(body, addressData);
						}

						// Override with manual billing address if provided
						if (billingAddress && Object.keys(billingAddress).length > 0) {
							Object.assign(body, billingAddress);
						}

						// Override with manual shipping address if provided
						if (shippingAddress && Object.keys(shippingAddress).length > 0) {
							Object.assign(body, shippingAddress);
						}

						const createResponse = await perfexCrmApiRequest.call(this, 'POST', '/customers', body);
						
						// After creating, search for the customer to get their ID
						const searchResults = await perfexCrmApiRequestAllItems.call(
							this,
							'GET',
							`/customers/search/${encodeURIComponent(company)}`,
						) as IDataObject[];
						
						// Find the matching customer (most recent one with exact company name)
						const createdCustomer = searchResults.find(c => c.company === company);
						
						if (createdCustomer) {
							responseData = {
								...createResponse as IDataObject,
								userid: createdCustomer.userid,
								customerId: createdCustomer.userid,
								customer: createdCustomer,
							};
						} else {
							responseData = createResponse;
						}
					}

					if (operation === 'update') {
						const customerId = this.getNodeParameter('customerId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length === 0) {
							throw new NodeOperationError(this.getNode(), 'At least one field must be provided to update', { itemIndex: i });
						}

						responseData = await perfexCrmApiRequest.call(this, 'PUT', `/customers/${customerId}`, updateFields);
					}
				}

				// ============ INVOICE ============
				if (resource === 'invoice') {
					if (operation === 'get') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						
						// Use search to find the invoice by ID (more reliable than direct get)
						const allInvoices = await perfexCrmApiRequestAllItems.call(this, 'GET', '/invoices') as IDataObject[];
						const invoice = allInvoices.find(inv => 
							String(inv.id) === invoiceId || inv.id === parseInt(invoiceId, 10)
						);
						
						if (invoice) {
							responseData = invoice;
						} else {
							throw new NodeOperationError(this.getNode(), `Invoice with ID ${invoiceId} not found`, { itemIndex: i });
						}
					}

					if (operation === 'getUrl') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						
						// Find the invoice to get the hash
						const allInvoices = await perfexCrmApiRequestAllItems.call(this, 'GET', '/invoices') as IDataObject[];
						const invoice = allInvoices.find(inv => 
							String(inv.id) === invoiceId || inv.id === parseInt(invoiceId, 10)
						);
						
						if (invoice && invoice.hash) {
							const invoiceUrl = `${baseUrl}/invoice/${invoice.id}/${invoice.hash}`;
							responseData = {
								invoiceId: invoice.id,
								invoiceNumber: invoice.number,
								hash: invoice.hash,
								invoiceUrl,
							};
						} else {
							throw new NodeOperationError(this.getNode(), `Invoice with ID ${invoiceId} not found or hash not available`, { itemIndex: i });
						}
					}

					if (operation === 'getAdminUrls') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						
						// Find the invoice to get details
						const allInvoices = await perfexCrmApiRequestAllItems.call(this, 'GET', '/invoices') as IDataObject[];
						const invoice = allInvoices.find(inv => 
							String(inv.id) === invoiceId || inv.id === parseInt(invoiceId, 10)
						);
						
						if (invoice) {
							// Admin panel direct link
							const adminUrl = `${baseUrl}/admin/invoices/list_invoices/${invoice.id}#${invoice.id}`;
							// Admin PDF URLs (requires admin login)
							const pdfViewUrl = `${baseUrl}/admin/invoices/pdf/${invoice.id}?output_type=I`;
							const pdfDownloadUrl = `${baseUrl}/admin/invoices/pdf/${invoice.id}`;
							
							responseData = {
								invoiceId: invoice.id,
								invoiceNumber: invoice.number,
								adminUrl,
								pdfViewUrl,
								pdfDownloadUrl,
							};
						} else {
							throw new NodeOperationError(this.getNode(), `Invoice with ID ${invoiceId} not found`, { itemIndex: i });
						}
					}

					if (operation === 'getAll') {
						const options = this.getNodeParameter('invoiceGetAllOptions', i) as IDataObject;
						let allInvoices = await perfexCrmApiRequestAllItems.call(this, 'GET', '/invoices') as IDataObject[];
						
						// Filter by customer ID if provided
						if (options.clientid) {
							allInvoices = allInvoices.filter(inv => 
								String(inv.clientid) === options.clientid || 
								inv.clientid === parseInt(options.clientid as string, 10)
							);
						}
						
						// Filter by status if provided
						if (options.status) {
							allInvoices = allInvoices.filter(inv => inv.status === options.status);
						}
						
						// Sort results
						const sortBy = (options.sortBy as string) || 'id_desc';
						allInvoices.sort((a, b) => {
							switch (sortBy) {
								case 'id_asc':
									return (a.id as number) - (b.id as number);
								case 'id_desc':
									return (b.id as number) - (a.id as number);
								case 'date_asc':
									return new Date(a.date as string).getTime() - new Date(b.date as string).getTime();
								case 'date_desc':
									return new Date(b.date as string).getTime() - new Date(a.date as string).getTime();
								case 'number_asc':
									return parseInt(a.number as string, 10) - parseInt(b.number as string, 10);
								case 'number_desc':
									return parseInt(b.number as string, 10) - parseInt(a.number as string, 10);
								default:
									return (b.id as number) - (a.id as number);
							}
						});
						
						// Apply limit
						const limit = (options.limit as number) || 50;
						responseData = allInvoices.slice(0, limit);
					}

					if (operation === 'search') {
						const searchQuery = this.getNodeParameter('searchQuery', i) as string;
						responseData = await perfexCrmApiRequestAllItems.call(
							this,
							'GET',
							`/invoices/search/${encodeURIComponent(searchQuery)}`,
						);
					}

					if (operation === 'create') {
						const clientid = this.getNodeParameter('clientid', i) as string;
						const date = this.getNodeParameter('date', i) as string;
						const currency = this.getNodeParameter('currency', i) as string;
						const billing_street = this.getNodeParameter('billing_street', i) as string;
						const setPaymentModes = this.getNodeParameter('setPaymentModes', i) as boolean;
						const itemsData = this.getNodeParameter('items', i) as IDataObject;
						const additionalFields = this.getNodeParameter('invoiceAdditionalFields', i) as IDataObject;

						const invoiceItems = (itemsData.itemValues as IDataObject[]) || [];
						if (invoiceItems.length === 0) {
							throw new NodeOperationError(this.getNode(), 'At least one item is required', { itemIndex: i });
						}

						// Get invoice number - auto-generate if not provided
						let invoiceNumber = (additionalFields.number as string) || '';
						if (!invoiceNumber) {
							// Get all invoices to find the highest number
							const allInvoices = await perfexCrmApiRequestAllItems.call(this, 'GET', '/invoices') as IDataObject[];
							
							// Filter invoices from the same year
							const currentYear = new Date(date).getFullYear();
							const sameYearInvoices = allInvoices.filter(inv => {
								const invYear = new Date(inv.date as string).getFullYear();
								return invYear === currentYear;
							});
							
							// Find the highest number
							let maxNumber = 0;
							sameYearInvoices.forEach(inv => {
								const num = parseInt(inv.number as string, 10);
								if (!isNaN(num) && num > maxNumber) {
									maxNumber = num;
								}
							});
							
							invoiceNumber = (maxNumber + 1).toString();
						}

						// Get S/N field ID
						const snFieldId = (additionalFields.snFieldId as string) || '8';

						// Parse payment modes only if enabled
						let paymentModes: string[] = [];
						if (setPaymentModes) {
							const paymentModesStr = this.getNodeParameter('allowed_payment_modes', i) as string;
							if (paymentModesStr) {
								paymentModes = paymentModesStr.split(',').map(m => m.trim()).filter(m => m);
							}
						}

						// Calculate totals including tax
						const discountPercent = (additionalFields.discount_percent as number) || 0;
						const discountTotal = (additionalFields.discount_total as number) || 0;
						const adjustment = (additionalFields.adjustment as number) || 0;
						const { subtotal, total, totalTax } = calculateInvoiceTotals(invoiceItems, discountPercent, discountTotal, adjustment);

						const body: IDataObject = {
							clientid,
							number: invoiceNumber,
							date,
							currency,
							billing_street,
							subtotal: subtotal.toFixed(2),
							total: total.toFixed(2),
							total_tax: totalTax.toFixed(2),
						};

						// Add other additional fields (except number, snFieldId, and customFields which we handle separately)
						const fieldsToAdd = { ...additionalFields };
						delete fieldsToAdd.number;
						delete fieldsToAdd.snFieldId;
						delete fieldsToAdd.customFields;
						Object.assign(body, fieldsToAdd);

						// Add payment modes only if set
						if (paymentModes.length > 0) {
							paymentModes.forEach((mode, index) => {
								body[`allowed_payment_modes[${index}]`] = mode;
							});
						}

						// Add items
						invoiceItems.forEach((item, index) => {
							body[`newitems[${index}][description]`] = item.description as string;
							body[`newitems[${index}][long_description]`] = (item.longDescription as string) || '';
							body[`newitems[${index}][qty]`] = item.quantity as number;
							body[`newitems[${index}][rate]`] = item.rate as number;
							body[`newitems[${index}][unit]`] = (item.unit as string) || '';
							body[`newitems[${index}][order]`] = index + 1;

							if (item.taxName) {
								body[`newitems[${index}][taxname][]`] = item.taxName as string;
							}

							// S/N custom field for items
							if (snFieldId && item.serialNumber) {
								body[`newitems[${index}][custom_fields][items][${snFieldId}]`] = item.serialNumber as string;
							}
						});

						// Add invoice-level custom fields
						const customFieldsData = additionalFields.customFields as IDataObject | undefined;
						if (customFieldsData && customFieldsData.customFieldValues) {
							const customFields = customFieldsData.customFieldValues as IDataObject[];
							customFields.forEach((field) => {
								const fieldId = field.fieldId as string;
								const value = field.value as string;
								if (fieldId) {
									body[`custom_fields[invoice][${fieldId}]`] = value || '';
								}
							});
						}

						const createResponse = await perfexCrmApiRequest.call(this, 'POST', '/invoices', body);
						
						// After creating, search for the invoice to get the ID
						const searchResults = await perfexCrmApiRequestAllItems.call(
							this,
							'GET',
							`/invoices/search/${encodeURIComponent(invoiceNumber)}`,
						) as IDataObject[];
						
						// Find the matching invoice (by number and client)
						const createdInvoice = searchResults.find(inv => 
							String(inv.number) === invoiceNumber && String(inv.clientid) === clientid
						);
						
						if (createdInvoice) {
							responseData = {
								...createResponse as IDataObject,
								invoiceId: createdInvoice.id,
								invoiceNumber: createdInvoice.number,
								clientid,
							};
						} else {
							responseData = {
								...createResponse as IDataObject,
								invoiceNumber,
								clientid,
							};
						}
					}
				}

				// ============ PAYMENT ============
				if (resource === 'payment') {
					if (operation === 'get') {
						const paymentId = this.getNodeParameter('paymentId', i) as string;
						responseData = await perfexCrmApiRequest.call(this, 'GET', `/payments/${paymentId}`);
					}

					if (operation === 'getAll') {
						responseData = await perfexCrmApiRequestAllItems.call(this, 'GET', '/payments');
					}

					if (operation === 'search') {
						const searchQuery = this.getNodeParameter('searchQuery', i) as string;
						responseData = await perfexCrmApiRequestAllItems.call(
							this,
							'GET',
							`/payments/search/${encodeURIComponent(searchQuery)}`,
						);
					}

					if (operation === 'create') {
						const invoiceid = this.getNodeParameter('invoiceid', i) as string;
						const amount = this.getNodeParameter('amount', i) as number;
						const paymentmode = this.getNodeParameter('paymentmode', i) as string;
						const additionalFields = this.getNodeParameter('paymentAdditionalFields', i) as IDataObject;

						const body: IDataObject = {
							invoiceid,
							amount: amount.toString(),
							paymentmode,
							...additionalFields,
						};

						const createResponse = await perfexCrmApiRequest.call(this, 'POST', '/payments', body);
						
						// The API returns payment_id in the response
						responseData = createResponse;
					}
				}

				// Return the data
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
