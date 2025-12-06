import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PerfexCrmApi implements ICredentialType {
	name = 'perfexCrmApi';
	displayName = 'Perfex CRM API';
	documentationUrl = 'https://perfexcrm.themesic.com/apiguide';
	
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://your-perfexcrm-domain.com',
			description: 'The base URL of your Perfex CRM installation (without trailing slash)',
			required: true,
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'The JWT API token from Perfex CRM API module',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				authtoken: '={{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/customers',
			method: 'GET',
		},
	};
}

