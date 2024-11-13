declare const CreateAgent: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["type", "name", "agent"];
        readonly properties: {
            readonly type: {
                readonly type: "string";
                readonly description: "Can be 'outbound' or 'inbound'";
                readonly default: "outbound";
                readonly examples: readonly ["outbound"];
            };
            readonly name: {
                readonly type: "string";
                readonly description: "Name of the person that gets called";
                readonly default: "David";
                readonly examples: readonly ["test"];
            };
            readonly description: {
                readonly type: "string";
                readonly examples: readonly ["test123"];
            };
            readonly phone_number: {
                readonly type: "string";
                readonly description: "Retrieve your phone numbers with the 'Get Numbers' API endpoint";
                readonly default: "+12345678987";
                readonly examples: readonly ["+496846948"];
            };
            readonly external_webhook_url: {
                readonly type: "string";
                readonly description: "URL of the webhook that should receive data after the call. (Transcript etc.)";
                readonly default: "https://webhook.site/79d7fcaf-93be-4936-85e5-b925213a29f3";
                readonly examples: readonly ["test"];
            };
            readonly is_recording: {
                readonly type: "boolean";
                readonly description: "'true' or 'false'";
                readonly default: false;
                readonly examples: readonly [true];
            };
            readonly agent: {
                readonly type: "object";
                readonly properties: {
                    readonly prompt: {
                        readonly type: "string";
                        readonly description: "Add variables with curly brackets → {your-variable}";
                        readonly examples: readonly ["You are a human in the middle of a conversation that you need to continue {lead_comp} following a script. Continue the conversations by following the [script] EXACTLY and don’t deviate. This script has to be word for word no matter what. but you can also generate new material based on what the prospect says, just make sure you say the script as well."];
                    };
                    readonly llm: {
                        readonly type: "string";
                        readonly description: "One of: synthflow llm, gpt-4 turbo, got-3.5 turbo, gpt-4o, llama 3";
                        readonly default: "synthflow llm";
                        readonly examples: readonly ["gpt-4"];
                    };
                    readonly language: {
                        readonly type: "string";
                        readonly description: "One of: 'en-US', 'en-GB', 'de', 'es', 'it', 'fr'";
                        readonly default: "en-US";
                    };
                    readonly greeting_message: {
                        readonly type: "string";
                        readonly description: "Add variables with curly brackets → {your-variable}";
                        readonly examples: readonly ["test"];
                    };
                    readonly voice_id: {
                        readonly type: "string";
                        readonly description: "Retrieve voices with the 'Get Voices' API endpoint";
                    };
                };
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["ok"];
                };
                readonly response: {
                    readonly type: "object";
                    readonly properties: {
                        readonly model_id: {
                            readonly type: "string";
                            readonly examples: readonly ["1710115769321x774248637171346600"];
                        };
                        readonly prompt_keys: {
                            readonly type: "array";
                            readonly items: {};
                        };
                    };
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetAgents: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["workspace_id"];
        readonly properties: {
            readonly workspace_id: {
                readonly type: "string";
                readonly description: "Workspace-ID which you can obtain from your Synthflow Agent Portal";
                readonly default: "1696372226173x164740052408336400";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetNumbers: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["workspace"];
        readonly properties: {
            readonly workspace: {
                readonly type: "string";
                readonly description: "Workspace-ID which you can obtain from your Synthflow Agent Portal";
                readonly default: "1696372226173x164740052408336400";
                readonly examples: readonly ["1710107690998x536152705164378100"];
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["ok"];
                };
                readonly response: {
                    readonly type: "object";
                    readonly properties: {
                        readonly phone_numbers: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly number: {
                                        readonly type: "string";
                                        readonly examples: readonly ["+14158811313"];
                                    };
                                    readonly sid: {
                                        readonly type: "string";
                                        readonly examples: readonly ["PN840358ba5ed985a2eb1f2ab4e83657f2"];
                                    };
                                };
                            };
                        };
                    };
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetNumbersCopy: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["model_id"];
        readonly properties: {
            readonly model_id: {
                readonly type: "string";
                readonly description: "Model-ID which you can obtain from your Synthflow Agent Page";
                readonly default: "1696372226173x164740052408336400";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["ok"];
                };
                readonly response: {
                    readonly type: "object";
                    readonly properties: {
                        readonly answer: {
                            readonly type: "string";
                            readonly examples: readonly ["Model deleted."];
                        };
                    };
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetNumbersCopy1: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["workspace"];
        readonly properties: {
            readonly workspace: {
                readonly type: "string";
                readonly description: "Workspace-ID which you can obtain from your Synthflow Portal";
                readonly default: "1696372226173x164740052408336400";
                readonly examples: readonly ["1710107690998x536152705164378100"];
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["ok"];
                };
                readonly response: {
                    readonly type: "object";
                    readonly properties: {
                        readonly voices: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly voice_id: {
                                        readonly type: "string";
                                        readonly examples: readonly ["wefw5e68456wef"];
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                        readonly examples: readonly ["test"];
                                    };
                                    readonly preview: {
                                        readonly type: "string";
                                        readonly examples: readonly [""];
                                    };
                                    readonly workspace: {
                                        readonly type: "string";
                                        readonly examples: readonly ["1710107690998x536152705164378100"];
                                    };
                                };
                            };
                        };
                    };
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const GetPhoneCall: {
    readonly metadata: {
        readonly allOf: readonly [{
            readonly type: "object";
            readonly properties: {
                readonly call_id: {
                    readonly type: "string";
                    readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
                };
            };
            readonly required: readonly [];
        }];
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const MakePhoneCallCopy: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["model", "phone", "name"];
        readonly properties: {
            readonly model: {
                readonly type: "string";
                readonly description: "Model-ID which you can obtain from your Synthflow Agent Page";
                readonly default: "1696372226173x164740052408336400";
            };
            readonly phone: {
                readonly type: "string";
                readonly description: "Phone number that the call goes to";
                readonly default: "+12345678987";
            };
            readonly name: {
                readonly type: "string";
                readonly description: "Name of the person that gets called";
                readonly default: "David";
            };
            readonly external_webhook_url: {
                readonly type: "string";
                readonly description: "URL of the webhook that should receive data after the call (Transcript etc.). [Learn more](https://docs.synthflow.ai/reference/webhook).";
                readonly default: "https://webhook.site/79d7fcaf-93be-4936-85e5-b925213a29f3";
            };
            readonly custom_variables: {
                readonly type: "array";
                readonly description: "Key-Value pairs of custom variables that you can dynamically inject into the prompt. [Learn more](https://docs.synthflow.ai/reference/custom-variables).";
                readonly default: readonly ["Company: Synthflow\""];
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly prompt: {
                readonly type: "string";
                readonly description: "Pass the prompt for the Assistant. [Learn more](https://docs.synthflow.ai/reference/prompt).";
                readonly default: "You are a helpful Assistant.";
            };
            readonly lead_email: {
                readonly type: "string";
                readonly description: "Optional email of the lead for appointment booking.";
                readonly default: "johndoe@synthflow.ai";
            };
            readonly lead_timezone: {
                readonly type: "string";
                readonly description: "Optional time zone name of the lead for appointment booking. [List of possible time zones](https://docs.synthflow.ai/reference/time-zones).";
                readonly default: "Europe/Berlin";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["success"];
                };
                readonly response: {
                    readonly type: "object";
                    readonly properties: {
                        readonly answer: {
                            readonly type: "string";
                            readonly examples: readonly ["ok"];
                        };
                        readonly call_id: {
                            readonly type: "string";
                            readonly examples: readonly ["1691579123700x31589864853004400"];
                        };
                    };
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
declare const VoiceCall: {
    readonly body: {
        readonly type: "object";
        readonly required: readonly ["model", "phone", "name"];
        readonly properties: {
            readonly model: {
                readonly type: "string";
                readonly description: "Model-ID which you can obtain from your Synthflow Agent Page";
                readonly default: "1696372226173x164740052408336400";
            };
            readonly phone: {
                readonly type: "string";
                readonly description: "Phone number that the call goes to";
                readonly default: "+12345678987";
            };
            readonly name: {
                readonly type: "string";
                readonly description: "Name of the person that gets called";
                readonly default: "David";
            };
            readonly external_webhook_url: {
                readonly type: "string";
                readonly description: "URL of the webhook that should receive data after the call (Transcript etc.). [Learn more](https://docs.synthflow.ai/reference/webhook).";
                readonly default: "https://webhook.site/79d7fcaf-93be-4936-85e5-b925213a29f3";
            };
            readonly custom_variables: {
                readonly type: "array";
                readonly description: "Key-Value pairs of custom variables that you can dynamically inject into the prompt. [Learn more](https://docs.synthflow.ai/reference/custom-variables).";
                readonly default: readonly ["Company: Synthflow\""];
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly prompt: {
                readonly type: "string";
                readonly description: "Pass the prompt for the Assistant. [Learn more](https://docs.synthflow.ai/reference/prompt).";
                readonly default: "You are a helpful Assistant.";
            };
            readonly lead_email: {
                readonly type: "string";
                readonly description: "Optional email of the lead for appointment booking.";
                readonly default: "johndoe@synthflow.ai";
            };
            readonly lead_timezone: {
                readonly type: "string";
                readonly description: "Optional time zone name of the lead for appointment booking. [List of possible time zones](https://docs.synthflow.ai/reference/time-zones).";
                readonly default: "Europe/Berlin";
            };
        };
        readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
    };
    readonly response: {
        readonly "200": {
            readonly type: "object";
            readonly properties: {
                readonly status: {
                    readonly type: "string";
                    readonly examples: readonly ["success"];
                };
                readonly response: {
                    readonly type: "object";
                    readonly properties: {
                        readonly answer: {
                            readonly type: "string";
                            readonly examples: readonly ["ok"];
                        };
                        readonly call_id: {
                            readonly type: "string";
                            readonly examples: readonly ["1691579123700x31589864853004400"];
                        };
                    };
                };
            };
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
        readonly "400": {
            readonly type: "object";
            readonly properties: {};
            readonly $schema: "https://json-schema.org/draft/2020-12/schema#";
        };
    };
};
export { CreateAgent, GetAgents, GetNumbers, GetNumbersCopy, GetNumbersCopy1, GetPhoneCall, MakePhoneCallCopy, VoiceCall };
