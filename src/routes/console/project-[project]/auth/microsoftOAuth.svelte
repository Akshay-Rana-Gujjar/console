<script lang="ts">
    import { page } from '$app/stores';
    import { Alert, CopyInput, Modal } from '$lib/components';
    import { Button, FormList, InputPassword, InputSwitch, InputText } from '$lib/elements/forms';
    import type { Provider } from '$lib/stores/oauth-providers';
    import { sdk } from '$lib/stores/sdk';
    import { onMount } from 'svelte';
    import { updateOAuth } from './updateOAuth';

    export let provider: Provider;

    let appId: string = null;
    let enabled: boolean = null;
    let clientSecret: string = null;
    let tenantID: string = null;
    let error: string;

    onMount(() => {
        appId ??= provider.appId;
        enabled ??= provider.enabled;
        if (provider.secret) ({ clientSecret, tenantID } = JSON.parse(provider.secret));
    });

    const projectId = $page.params.project;

    const update = async () => {
        const result = await updateOAuth({ projectId, provider, secret, appId, enabled });

        if (result.status === 'error') {
            error = result.message;
        } else {
            provider = null;
        }
    };

    $: secret =
        clientSecret && tenantID ? JSON.stringify({ clientSecret, tenantID }) : provider.secret;
</script>

<Modal {error} onSubmit={update} size="big" show on:close>
    <svelte:fragment slot="header">{provider.name} OAuth2 Settings</svelte:fragment>
    <FormList>
        <p>
            To use {provider.name} authentication in your application, first fill in this form. For more
            info you can
            <a class="link" href={provider.docs} target="_blank" rel="noopener noreferrer">
                visit the docs.
            </a>
        </p>
        <InputSwitch id="state" bind:value={enabled} label={enabled ? 'Enabled' : 'Disabled'} />
        <InputText
            id="appID"
            label="Application (client) ID"
            autofocus={true}
            placeholder="Enter ID"
            bind:value={appId} />
        <InputPassword
            id="secret"
            label="Client Secret"
            placeholder="Enter Client Secret"
            showPasswordButton
            minlength={0}
            bind:value={clientSecret} />
        <InputText
            id="tenant"
            label="Target Tenant"
            placeholder="'common','organizations','consumers' or your TenantID"
            bind:value={tenantID} />
        <Alert type="info">
            To complete set up, add this OAuth2 redirect URI to your {provider.name} app configuration.
        </Alert>
        <div>
            <p>URI</p>
            <CopyInput
                value={`${sdk.forConsole.client.config.endpoint}/account/sessions/oauth2/callback/${provider.key}/${projectId}`} />
        </div>
    </FormList>
    <svelte:fragment slot="footer">
        <Button secondary on:click={() => (provider = null)}>Cancel</Button>
        <Button
            disabled={(secret === provider.secret &&
                enabled === provider.enabled &&
                appId === provider.appId) ||
                !(appId && clientSecret && tenantID)}
            submit>Update</Button>
    </svelte:fragment>
</Modal>
