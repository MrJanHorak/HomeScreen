import {readJsonResponse} from '../../../../shared/src/http';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type GetToken = () => Promise<string | null>;

interface ClientMessages {
  signIn: string;
  failure: string;
}

/** Keep transport concerns here; editors own their state and account-change guards. */
export function createApiClient(apiUrl: string, getToken: GetToken, messages: ClientMessages) {
  return async function request<T>(path: string, method: Method = 'GET', body?: object): Promise<T> {
    const token = await getToken();
    if (!token) throw new Error(messages.signIn);

    const response = await fetch(`${apiUrl}/${path}`, {
      method,
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
    return readJsonResponse<T>(response, messages.failure);
  };
}
