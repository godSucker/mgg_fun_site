import type { APIRoute } from 'astro';
import { parseTierData } from '../../lib/tier-parser';

// Valid tier values
const VALID_TIERS = ['1+', '1-', '2+', '2', '2-', '3+', '3', '3-', '4'];

// Telegram bot token
const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
const API_TOKEN = import.meta.env.API_UPDATE_TOKEN;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Properly handle the request body
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Handle different types of updates
    if (body.message) {
      if (body.message.document) {
        // Process document (file) upload
        const fileId = body.message.document.file_id;
        const fileName = body.message.document.file_name;

        console.log(`Received file: ${fileName} with ID: ${fileId}`);

        try {
          // Get file info from Telegram
          const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileInfo = await fileResponse.json();

          if (!fileInfo.ok) {
            throw new Error(`Could not get file info: ${fileInfo.description}`);
          }

          // Download the file content
          const filePath = fileInfo.result.file_path;
          const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

          const fileContentResponse = await fetch(fileUrl);
          const fileContent = await fileContentResponse.text();

          // Parse the tier data from the file content
          const parsedTiers = await parseTierData(fileContent);

          // Validate tier values
          for (const [mutantId, tier] of Object.entries(parsedTiers)) {
            if (!VALID_TIERS.includes(tier)) {
              return new Response(
                JSON.stringify({ error: `Invalid tier value "${tier}" for mutant ${mutantId}` }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }

          // For now, we'll update the mutants.json file directly using GitHub API
          // This requires a GitHub token with appropriate permissions
          const githubToken = import.meta.env.GITHUB_TOKEN;
          const owner = import.meta.env.REPO_OWNER;
          const repo = import.meta.env.REPO_NAME;

          if (githubToken && owner && repo) {
            try {
              // Read the current mutants.json file
              const fileResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/src/data/mutants/mutants.json`,
                {
                  headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                }
              );

              if (!fileResponse.ok) {
                console.error('Failed to fetch current mutants.json:', await fileResponse.text());
                return new Response(
                  JSON.stringify({ error: 'Failed to fetch current mutants.json' }),
                  { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
              }

              const fileData = await fileResponse.json();
              const currentContent = atob(fileData.content);
              const currentMutants = JSON.parse(currentContent);

              // Apply the tier updates
              let updatedCount = 0;
              for (const [mutantId, newTier] of Object.entries(parsedTiers)) {
                const mutantIndex = currentMutants.findIndex(m => m.id === mutantId);

                if (mutantIndex !== -1) {
                  currentMutants[mutantIndex].tier = newTier;
                  updatedCount++;
                }
              }

              // Update the file in the repository
              const updatedContent = JSON.stringify(currentMutants, null, 2);
              const updateResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/src/data/mutants/mutants.json`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    message: `Auto-update: ${updatedCount} mutant tier updates from Telegram bot`,
                    content: btoa(updatedContent),
                    sha: fileData.sha,
                    branch: 'main'
                  })
                }
              );

              if (!updateResponse.ok) {
                console.error('Failed to update mutants.json:', await updateResponse.text());
              } else {
                console.log(`Successfully updated ${updatedCount} mutant tiers in mutants.json`);
              }
            } catch (updateError) {
              console.error('Error updating mutants.json:', updateError);
            }
          }

          // Respond to Telegram
          return new Response(
            JSON.stringify({
              success: true,
              message: `Received ${Object.keys(parsedTiers).length} tier updates.`
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (downloadError) {
          console.error('Error downloading or processing file:', downloadError);
          return new Response(
            JSON.stringify({ error: 'Could not download or process the file', details: downloadError.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else if (body.message.text) {
        // Handle text commands
        const text = body.message.text;
        let responseText = '';

        if (text === '/start') {
          responseText = 'Welcome! Send me a file with tier data to update mutants.';
        } else if (text === '/help') {
          responseText = 'Send me a .txt file with tier data.';
        } else {
          responseText = 'Send me a file with tier data to update mutants.';
        }

        return new Response(
          JSON.stringify({ message: responseText }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ message: 'Update received' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  const params = new URLSearchParams(url.search);
  const action = params.get('action');

  if (action === 'setWebhook') {
    if (!BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'BOT_TOKEN not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${url.origin}/api/telegram-webhook`;
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

    try {
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      });

      const result = await response.json();
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ message: 'Telegram webhook endpoint' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};