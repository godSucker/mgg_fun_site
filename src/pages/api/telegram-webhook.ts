import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
  const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
  const REPO_OWNER = import.meta.env.REPO_OWNER;
  const REPO_NAME = import.meta.env.REPO_NAME;
  const WEBHOOK_SECRET = import.meta.env.TELEGRAM_WEBHOOK_SECRET;

  // Validate Telegram secret_token header
  if (WEBHOOK_SECRET) {
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretToken !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    if (body.message && body.message.document) {
      const fileId = body.message.document.file_id;
      const fileName = body.message.document.file_name;

      console.log(`Received file: ${fileName}`);

      // Get file from Telegram
      const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileInfo = await fileResponse.json();

      if (!fileInfo.ok) {
        throw new Error('Failed to get file from Telegram');
      }

      // Download file content
      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
      const fileContent = await (await fetch(fileUrl)).text();

      // Load mutants.json from GitHub
      const mutantsRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
        { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } }
      );
      
      console.log(`Mutants API response: ${mutantsRes.status}`);
      
      if (!mutantsRes.ok) {
        console.error(`GitHub API error: ${mutantsRes.status}`);
        throw new Error('Failed to load mutants data');
      }
      
      const mutantsData = await mutantsRes.json();
      
      // For large files, GitHub returns empty content - use download_url instead
      let mutantsJson;
      if (mutantsData.content && mutantsData.content.length > 0) {
        mutantsJson = atob(mutantsData.content);
      } else if (mutantsData.download_url) {
        const downloadRes = await fetch(mutantsData.download_url);
        if (!downloadRes.ok) {
          throw new Error('Failed to download mutants data');
        }
        mutantsJson = await downloadRes.text();
      } else {
        throw new Error('No content available for mutants.json');
      }

      // Parse tiers
      const { parseTierData } = await import('../../lib/tier-parser');
      const parsedTiers = parseTierData(fileContent, mutantsJson);

      // Validate
      const VALID_TIERS = ['1', '1+', '1-', '2', '2+', '2-', '3', '3+', '3-', '4', 'un-tired'];
      for (const [mutantId, tier] of Object.entries(parsedTiers)) {
        if (!VALID_TIERS.includes(tier)) {
          return new Response(JSON.stringify({ error: 'Invalid tier data' }), { status: 400 });
        }
      }

      // Update via GitHub API
      if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME) {
        const fileRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
          { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } }
        );

        const fileData = await fileRes.json();
        
        let currentMutants;
        if (fileData.content && fileData.content.length > 0) {
          currentMutants = JSON.parse(atob(fileData.content));
        } else if (fileData.download_url) {
          const downloadRes = await fetch(fileData.download_url);
          const text = await downloadRes.text();
          currentMutants = JSON.parse(text);
        } else {
          throw new Error('Cannot get mutants.json content');
        }

        let count = 0;
        for (const [mutantId, newTier] of Object.entries(parsedTiers)) {
          const idx = currentMutants.findIndex(m => m.id === mutantId);
          if (idx !== -1) {
            currentMutants[idx].tier = newTier;
            count++;
          }
        }

        const updatedContent = JSON.stringify(currentMutants, null, 2);
        const encoded = Buffer.from(updatedContent, 'utf-8').toString('base64');
        
        const updateRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Update: ${count} tiers from Telegram`,
              content: encoded,
              sha: fileData.sha,
              branch: 'main'
            })
          }
        );

        if (!updateRes.ok) {
          throw new Error('Failed to update file');
        }

        console.log(`Updated ${count} tiers`);
        
        const chatId = body.message.chat.id;
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ Успех! Обновлено ${count} тиров мутантов.`
          })
        });
      }

      return new Response(JSON.stringify({ success: true, count: Object.keys(parsedTiers).length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'OK' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
