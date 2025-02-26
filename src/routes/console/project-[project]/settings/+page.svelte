<script lang="ts">
    import { sdk } from '$lib/stores/sdk';
    import { onMount } from 'svelte';
    import { toLocaleDateTime } from '$lib/helpers/date';
    import { addNotification } from '$lib/stores/notifications';
    import { organizationList } from '$lib/stores/organization';
    import { project } from '../store';
    import { services, type Service } from '$lib/stores/project-services';
    import { CardGrid, CopyInput, Box, Heading } from '$lib/components';
    import {
        Button,
        Form,
        FormList,
        InputText,
        InputSwitch,
        InputSelect
    } from '$lib/elements/forms';
    import { Container } from '$lib/layout';
    import { invalidate } from '$app/navigation';
    import { Dependencies } from '$lib/constants';
    import Delete from './deleteProject.svelte';
    import { base } from '$app/paths';
    import { page } from '$app/stores';
    import { Submit, trackEvent, trackError } from '$lib/actions/analytics';
    import EnableAllServices from './enableAllServices.svelte';
    import DisableAllServices from './disableAllServices.svelte';
    import Transfer from './transferProject.svelte';

    let name: string = null;
    let teamId: string = null;
    let showDelete = false;
    let showTransfer = false;
    const endpoint = sdk.forConsole.client.config.endpoint;
    const projectId = $page.params.project;
    let showDisableAll = false;
    let showEnableAll = false;

    onMount(async () => {
        name ??= $project.name;
        teamId ??= $project.teamId;
    });

    async function updateName() {
        try {
            await sdk.forConsole.projects.update($project.$id, name);
            await invalidate(Dependencies.PROJECT);
            addNotification({
                type: 'success',
                message: 'Project name has been updated'
            });
            trackEvent(Submit.ProjectUpdateName);
        } catch (error) {
            addNotification({
                type: 'error',
                message: error.message
            });
            trackError(error, Submit.ProjectUpdateName);
        }
    }

    async function toggleAllServices(status: boolean) {
        if (status && !showEnableAll) {
            showEnableAll = true;
            return;
        }
        if (!status && !showDisableAll) {
            showDisableAll = true;
            return;
        }

        try {
            const path = '/projects/' + $project.$id + '/service/all';
            await sdk.forConsole.client.call(
                'PATCH',
                new URL(sdk.forConsole.client.config.endpoint + path),
                {
                    'X-Appwrite-Project': sdk.forConsole.client.config.project,
                    'content-type': 'application/json'
                },
                {
                    status: status
                }
            );
            invalidate(Dependencies.PROJECT);
            addNotification({
                type: 'success',
                message:
                    'All services for ' +
                    $project.name +
                    ' has been ' +
                    (status ? 'enabled.' : 'disabled.')
            });
            trackEvent(Submit.ProjectService);
        } catch (error) {
            addNotification({
                type: 'error',
                message: error.message
            });
            trackError(error, Submit.ProjectService);
        } finally {
            showDisableAll = false;
            showEnableAll = false;
        }
    }

    async function serviceUpdate(service: Service) {
        try {
            await sdk.forConsole.projects.updateServiceStatus(
                $project.$id,
                service.method,
                service.value
            );
            await invalidate(Dependencies.PROJECT);
            addNotification({
                type: 'success',
                message: `${service.label} service has been ${
                    service.value ? 'enabled' : 'disabled'
                }`
            });
            trackEvent(Submit.ProjectService, {
                method: service.method,
                value: service.value
            });
        } catch (error) {
            addNotification({
                type: 'error',
                message: error.message
            });
            trackError(error, Submit.ProjectService);
        }
    }

    $: services.load($project);
</script>

<Container>
    {#if $project}
        <Form onSubmit={updateName}>
            <CardGrid>
                <Heading tag="h6" size="7">API Credentials</Heading>
                <p class="text">Access Appwrite services using your API Endpoint and Project ID.</p>
                <svelte:fragment slot="aside">
                    <FormList>
                        <CopyInput label="Project ID" showLabel={true} value={$project.$id} />
                        <CopyInput label="API Endpoint" showLabel={true} value={endpoint} />
                    </FormList>
                </svelte:fragment>
                <svelte:fragment slot="actions">
                    <Button
                        secondary
                        event="view_keys"
                        href={`${base}/console/project-${projectId}/overview/keys#integrations`}>
                        View API Keys
                    </Button>
                </svelte:fragment>
            </CardGrid>
            <CardGrid>
                <Heading tag="h6" size="7">Name</Heading>

                <svelte:fragment slot="aside">
                    <FormList>
                        <InputText
                            id="name"
                            label="Name"
                            bind:value={name}
                            required
                            placeholder="Enter name" />
                    </FormList>
                </svelte:fragment>

                <svelte:fragment slot="actions">
                    <Button disabled={name === $project.name} submit>Update</Button>
                </svelte:fragment>
            </CardGrid>
        </Form>

        <CardGrid>
            <Heading tag="h6" size="7">Services</Heading>
            <p class="text">
                Choose services you wish to enable or disable for the client API. When disabled, the
                services are not accessible to client SDKs but remain accessible to server SDKs.
            </p>
            <svelte:fragment slot="aside">
                <ul class="buttons-list u-main-end">
                    <li class="buttons-list-item">
                        <Button text={true} on:click={() => toggleAllServices(true)}
                            >Enable all</Button>
                    </li>
                    <li class="buttons-list-item">
                        <Button text={true} on:click={() => toggleAllServices(false)}
                            >Disable all</Button>
                    </li>
                </ul>
                <FormList>
                    <form class="form card-separator">
                        <ul class="form-list is-multiple">
                            {#each $services.list as service}
                                <InputSwitch
                                    label={service.label}
                                    id={service.method}
                                    bind:value={service.value}
                                    on:change={() => {
                                        serviceUpdate(service);
                                    }} />
                            {/each}
                        </ul>
                    </form>
                </FormList>
            </svelte:fragment>
        </CardGrid>
        <CardGrid>
            <Heading tag="h6" size="7">Transfer project</Heading>
            <p class="text">Transfer your project to another organization that you own.</p>

            <svelte:fragment slot="aside">
                <FormList>
                    <InputSelect
                        id="organization"
                        label="Available organizations"
                        bind:value={teamId}
                        options={$organizationList.teams.map((team) => ({
                            value: team.$id,
                            label: team.name
                        }))} />
                </FormList>
            </svelte:fragment>

            <svelte:fragment slot="actions">
                <Button
                    secondary
                    disabled={teamId === $project.teamId}
                    on:click={() => (showTransfer = true)}>Transfer</Button>
            </svelte:fragment>
        </CardGrid>
        <CardGrid danger>
            <div>
                <Heading tag="h6" size="7">Delete Project</Heading>
            </div>
            <p>
                The project will be permanently deleted, including all the metadata, resources and
                stats within it. This action is irreversible.
            </p>
            <svelte:fragment slot="aside">
                <Box>
                    <svelte:fragment slot="title">
                        <h6 class="u-bold u-trim-1">{$project.name}</h6>
                    </svelte:fragment>
                    <p>Last update: {toLocaleDateTime($project.$updatedAt)}</p>
                </Box>
            </svelte:fragment>

            <svelte:fragment slot="actions">
                <Button secondary on:click={() => (showDelete = true)}>Delete</Button>
            </svelte:fragment>
        </CardGrid>
    {/if}
</Container>

<Delete bind:showDelete />
<DisableAllServices handleDisableAll={() => toggleAllServices(false)} bind:show={showDisableAll} />
<EnableAllServices handleEnableAll={() => toggleAllServices(true)} bind:show={showEnableAll} />
{#if teamId}
    <Transfer
        bind:teamId
        teamName={$organizationList.teams.find((t) => t.$id == teamId).name}
        bind:show={showTransfer} />
{/if}
