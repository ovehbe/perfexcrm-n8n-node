import {
	IExecuteFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	IDataObject,
	NodeApiError,
	JsonObject,
} from 'n8n-workflow';

/**
 * Make an API request to Perfex CRM
 */
export async function perfexCrmApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('perfexCrmApi');
	
	const options: IRequestOptions = {
		method,
		uri: `${credentials.baseUrl}/api${endpoint}`,
		headers: {
			authtoken: credentials.apiToken as string,
		},
		qs,
		json: true,
	};

	if (Object.keys(body).length > 0) {
		if (method === 'POST') {
			// POST uses form data
			options.form = body;
		} else if (method === 'PUT') {
			// PUT uses JSON body
			options.body = body;
		}
	}

	try {
		const response = await this.helpers.request(options);
		
		// Check if response indicates an error
		if (response && response.status === false) {
			throw new NodeApiError(this.getNode(), response as JsonObject, {
				message: response.message || 'Unknown error',
			});
		}
		
		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request and return all results (for list operations)
 */
export async function perfexCrmApiRequestAllItems(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const response = await perfexCrmApiRequest.call(this, method, endpoint, body, qs);
	
	if (Array.isArray(response)) {
		return response;
	}
	
	return [response];
}

/**
 * Build address data for customer creation/update
 */
export function buildAddressData(
	address: string,
	city: string,
	state: string,
	zip: string,
	country: string,
	copyToBilling: boolean,
	copyToShipping: boolean,
): IDataObject {
	const data: IDataObject = {
		address,
		city,
		state,
		zip,
		country,
	};

	if (copyToBilling) {
		data.billing_street = address;
		data.billing_city = city;
		data.billing_state = state;
		data.billing_zip = zip;
		data.billing_country = country;
	}

	if (copyToShipping) {
		data.shipping_street = address;
		data.shipping_city = city;
		data.shipping_state = state;
		data.shipping_zip = zip;
		data.shipping_country = country;
	}

	return data;
}

/**
 * Build invoice items array for API request
 */
export function buildInvoiceItems(
	items: IDataObject[],
	serialNumberFieldId?: string,
): IDataObject {
	const newItems: IDataObject = {};
	
	items.forEach((item, index) => {
		const itemData: IDataObject = {
			description: item.description as string,
			long_description: (item.longDescription as string) || '',
			qty: item.quantity as number,
			rate: item.rate as number,
			unit: (item.unit as string) || '',
			order: index + 1,
		};

		// Add tax if provided
		if (item.taxName) {
			itemData['taxname'] = [item.taxName as string];
		}

		// Add S/N custom field if provided
		if (serialNumberFieldId && item.serialNumber) {
			itemData[`custom_fields[items][${serialNumberFieldId}]`] = item.serialNumber;
		}

		newItems[index.toString()] = itemData;
	});

	return { newitems: newItems };
}

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(
	items: IDataObject[],
	discountPercent: number = 0,
	discountTotal: number = 0,
	adjustment: number = 0,
): { subtotal: number; total: number } {
	let subtotal = 0;
	
	items.forEach((item) => {
		const qty = item.quantity as number;
		const rate = item.rate as number;
		subtotal += qty * rate;
	});

	let total = subtotal;
	
	if (discountPercent > 0) {
		total -= subtotal * (discountPercent / 100);
	} else if (discountTotal > 0) {
		total -= discountTotal;
	}
	
	total += adjustment;

	return { subtotal, total };
}

