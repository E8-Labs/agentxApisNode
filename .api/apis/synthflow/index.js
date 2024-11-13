import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';
class SDK {
    constructor() {
        this.spec = Oas.init(definition);
        this.core = new APICore(this.spec, 'synthflow/unknown (api/6.1.2)');
    }
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    config(config) {
        this.core.setConfig(config);
    }
    /**
     * If the API you're using requires authentication you can supply the required credentials
     * through this method and the library will magically determine how they should be used
     * within your API request.
     *
     * With the exception of OpenID and MutualTLS, it supports all forms of authentication
     * supported by the OpenAPI specification.
     *
     * @example <caption>HTTP Basic auth</caption>
     * sdk.auth('username', 'password');
     *
     * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
     * sdk.auth('myBearerToken');
     *
     * @example <caption>API Keys</caption>
     * sdk.auth('myApiKey');
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
     * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
     * @param values Your auth credentials for the API; can specify up to two strings or numbers.
     */
    auth(...values) {
        this.core.setAuth(...values);
        return this;
    }
    /**
     * If the API you're using offers alternate server URLs, and server variables, you can tell
     * the SDK which one to use with this method. To use it you can supply either one of the
     * server URLs that are contained within the OpenAPI definition (along with any server
     * variables), or you can pass it a fully qualified URL to use (that may or may not exist
     * within the OpenAPI definition).
     *
     * @example <caption>Server URL with server variables</caption>
     * sdk.server('https://{region}.api.example.com/{basePath}', {
     *   name: 'eu',
     *   basePath: 'v14',
     * });
     *
     * @example <caption>Fully qualified server URL</caption>
     * sdk.server('https://eu.api.example.com/v14');
     *
     * @param url Server URL
     * @param variables An object of variables to replace into the server URL.
     */
    server(url, variables = {}) {
        this.core.setServer(url, variables);
    }
    /**
     * Initiates a real-time voice call through the AI assistant.
     *
     * @summary Make Phone Call
     * @throws FetchError<400, types.VoiceCallResponse400> 400
     */
    voiceCall(body) {
        return this.core.fetch('/v2_voice_agent_call', 'post', body);
    }
    /**
     * Provides transcript and other relevant information of a phone call.
     *
     * @summary Get Phone Call
     * @throws FetchError<400, types.GetPhoneCallResponse400> 400
     */
    getPhoneCall(metadata) {
        return this.core.fetch('/v2_voice_agent_transcript', 'get', metadata);
    }
    /**
     * This endpoint creates a new agent and retrieves it's model id.
     *
     * @summary Create Assistant
     * @throws FetchError<400, types.CreateAgentResponse400> 400
     */
    createAgent(body) {
        return this.core.fetch('/v2_voice_agent_create', 'post', body);
    }
    /**
     * Lists all the agents in a workspace.
     *
     * @summary List Assistants
     * @throws FetchError<400, types.GetAgentsResponse400> 400
     */
    getAgents(body) {
        return this.core.fetch('/v2_voice_agents', 'post', body);
    }
    /**
     * Lists all the phone numbers assigned to a workspace.
     *
     * @summary Get Numbers
     * @throws FetchError<400, types.GetNumbersResponse400> 400
     */
    getNumbers(body) {
        return this.core.fetch('/v2_voice_agent_numbers', 'post', body);
    }
    /**
     * Delete Assistant
     *
     * @throws FetchError<400, types.GetNumbersCopyResponse400> 400
     */
    getNumbersCopy(body) {
        return this.core.fetch('/v2_voice_agent_delete', 'post', body);
    }
    /**
     * Lists all the voices assigned to a workspace.
     *
     * @summary Get Voices
     * @throws FetchError<400, types.GetNumbersCopy1Response400> 400
     */
    getNumbersCopy1(body) {
        return this.core.fetch('/v2_voice_agent_voices', 'post', body);
    }
    /**
     * Initiates a real-time voice call through the AI assistant.
     *
     * @summary Make Phone Call (COPY)
     * @throws FetchError<400, types.MakePhoneCallCopyResponse400> 400
     */
    makePhoneCallCopy(body) {
        return this.core.fetch('/v2_voice_agent_call (COPY)', 'post', body);
    }
}
const createSDK = (() => { return new SDK(); })();
export default createSDK;
