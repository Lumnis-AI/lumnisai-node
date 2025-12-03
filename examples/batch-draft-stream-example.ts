/**
 * Example: Batch Draft Creation with Real-Time Progress (SSE Streaming)
 * 
 * This example demonstrates how to use the streaming batch draft creation endpoint
 * to create drafts for multiple prospects with real-time progress updates.
 * 
 * Key Features:
 * - Real-time progress updates (percentage, current prospect)
 * - Immediate draft creation notifications
 * - Error handling per prospect
 * - Better UX for large batches (30+ prospects)
 * 
 * The streaming endpoint provides Server-Sent Events (SSE) that allow you to
 * update your UI in real-time as drafts are being created.
 */

import { LumnisClient } from '../src'

async function main() {
  // Initialize client
  const client = new LumnisClient({
    apiKey: process.env.LUMNIS_API_KEY || 'your-api-key',
    baseUrl: process.env.LUMNIS_BASE_URL, // Optional: defaults to production
  })

  const userId = 'user@example.com'
  const projectId = 'project-456'

  // Sample prospects
  const prospects = [
    {
      externalId: 'prospect-1',
      name: 'John Doe',
      email: 'john@example.com',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      isPriority: false,
    },
    {
      externalId: 'prospect-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      linkedinUrl: 'https://linkedin.com/in/janesmith',
      isPriority: true,
    },
    {
      externalId: 'prospect-3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      linkedinUrl: 'https://linkedin.com/in/bobjohnson',
      isPriority: false,
    },
    // Add more prospects as needed...
  ]

  // ═══════════════════════════════════════════════════════════════════
  // EXAMPLE 1: Using Callbacks (Recommended for UI updates)
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n=== Example 1: Batch Draft Creation with Callbacks ===\n')

  try {
    const result = await client.messaging.createBatchDraftsStream(
      userId,
      {
        prospects,
        projectId,
        channel: 'linkedin',
        useAiGeneration: true,
        aiContext: {
          roleTitle: 'Senior Software Engineer',
          userName: 'Jane Smith',
          userCompany: 'Acme Corp',
        },
      },
      {
        onProgress: (processed, total, percentage, prospectName) => {
          console.log(`📊 Progress: ${percentage.toFixed(1)}% (${processed}/${total}) - Processing: ${prospectName}`)
          // Update progress bar in UI: updateProgressBar(percentage)
        },
        onDraftCreated: (draft) => {
          console.log(`✅ Draft created: ${draft.id} for ${draft.prospectExternalId}`)
          // Add draft to UI list: addDraftToUI(draft)
        },
        onError: (prospect, error) => {
          console.error(`❌ Error for ${prospect}: ${error}`)
          // Show error notification: showErrorNotification(prospect, error)
        },
        onComplete: (result) => {
          console.log(`\n🎉 Complete! Created: ${result.created}, Errors: ${result.errors}`)
          // Show completion message: showCompletionMessage(result)
        },
      },
    )

    console.log('\nFinal Result:')
    console.log(`  Created: ${result.created}`)
    console.log(`  Errors: ${result.errors}`)
    console.log(`  Drafts: ${result.drafts.length}`)
    if (result.errorDetails && result.errorDetails.length > 0) {
      console.log('\nError Details:')
      result.errorDetails.forEach((error) => {
        console.log(`  - ${JSON.stringify(error)}`)
      })
    }
  }
  catch (error) {
    console.error('Batch creation failed:', error)
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXAMPLE 2: Using Async Generator (More Control)
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n\n=== Example 2: Batch Draft Creation with Async Generator ===\n')

  try {
    const drafts: any[] = []
    const errors: Array<{ prospect: string; error: string }> = []
    let progress = 0
    let currentProspect = ''

    for await (const event of client.messaging.createBatchDraftsStreamGenerator(
      userId,
      {
        prospects,
        projectId,
        channel: 'linkedin',
        useAiGeneration: true,
        aiContext: {
          roleTitle: 'Senior Software Engineer',
          userName: 'Jane Smith',
          userCompany: 'Acme Corp',
        },
      },
    )) {
      switch (event.event) {
        case 'progress': {
          const data = event.data as any
          progress = data.percentage || 0
          currentProspect = data.currentProspect || ''
          console.log(`📊 Progress: ${progress.toFixed(1)}% - ${currentProspect}`)
          break
        }
        case 'draft_created': {
          const data = event.data as any
          const draft = data.draft
          drafts.push(draft)
          console.log(`✅ Draft created: ${draft.id}`)
          break
        }
        case 'error': {
          const data = event.data as any
          errors.push({ prospect: data.prospect || 'Unknown', error: data.error || '' })
          console.error(`❌ Error: ${data.prospect} - ${data.error}`)
          break
        }
        case 'complete': {
          const data = event.data as any
          console.log(`\n🎉 Complete! Created: ${data.created}, Errors: ${data.errors}`)
          break
        }
      }
    }

    console.log(`\nTotal drafts created: ${drafts.length}`)
    console.log(`Total errors: ${errors.length}`)
  }
  catch (error) {
    console.error('Batch creation failed:', error)
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXAMPLE 3: Comparison with Non-Streaming Endpoint
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n\n=== Example 3: Non-Streaming Endpoint (for comparison) ===\n')

  try {
    console.log('Creating drafts (no progress updates)...')
    const result = await client.messaging.createBatchDrafts(userId, {
      prospects,
      projectId,
      channel: 'linkedin',
      useAiGeneration: true,
      aiContext: {
        roleTitle: 'Senior Software Engineer',
        userName: 'Jane Smith',
        userCompany: 'Acme Corp',
      },
    })

    console.log(`✅ Complete! Created: ${result.created}, Errors: ${result.errors}`)
    console.log(`   Drafts: ${result.drafts.length}`)
  }
  catch (error) {
    console.error('Batch creation failed:', error)
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXAMPLE 4: Error Handling
  // ═══════════════════════════════════════════════════════════════════

  console.log('\n\n=== Example 4: Error Handling ===\n')

  try {
    await client.messaging.createBatchDraftsStream(
      userId,
      {
        prospects: [
          {
            externalId: 'invalid-1',
            name: 'Invalid Prospect',
            // Missing required fields to trigger error
          },
        ],
        projectId,
        channel: 'linkedin',
        useAiGeneration: true,
      },
      {
        onError: (prospect, error) => {
          console.log(`Handled error for ${prospect}: ${error}`)
          // Individual prospect errors don't stop the batch
        },
        onComplete: (result) => {
          console.log(`Batch completed with ${result.errors} errors`)
        },
      },
    )
  }
  catch (error) {
    // Network errors, authentication errors, etc. are thrown
    console.error('Request failed:', error)
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

