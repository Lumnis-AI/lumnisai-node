# Campaign sending inbox

Set `emailMailboxId` on campaign creation to use exactly one authorized mailbox.
It must belong to the selected `emailPersonaId`. Omitted or null keeps automatic
selection. The saved pin is returned on campaign reads and cannot be updated.
If the selected mailbox cannot send, the backend waits without changing sender.

```ts
const campaign = await client.campaigns.createCampaign({
  userId,
  name,
  playbookId,
  emailPersonaId,
  emailMailboxId,
})
if (emailMailboxId != null
  && campaign.emailMailboxId?.toLowerCase() !== emailMailboxId.toLowerCase()) {
  throw new Error('The selected inbox was not saved; do not start this campaign.')
}
```

Requires the backend exact-inbox migration and enforcement. An older backend
may omit the response field; verify a requested pin before enrolling or starting.

## Automatic outreach

Set `allowAutomaticOutreach: false` through `email.updateMailbox` to exclude an
inbox from automatic campaigns. Campaigns explicitly pinned to it may still send.
`email.connectInbox` accepts this setting for a new inbox; reconnect preserves
the existing saved setting. Omitting it retains the backend default of true.
The inbox list and mailbox update response return the saved setting.

This setting requires the separate backend automatic-outreach migration. It does
not change existing campaign pins. Already assigned automatic work waits when
its mailbox is excluded; it does not switch to another address.
