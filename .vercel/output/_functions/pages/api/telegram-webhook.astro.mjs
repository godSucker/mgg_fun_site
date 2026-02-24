export { r as renderers } from '../../chunks/_@astro-renderers_DtO3kaqa.mjs';

const POST = async ({ request }) => {
  const BOT_TOKEN = undefined                                  ;
  const GITHUB_TOKEN = undefined                            ;
  const REPO_OWNER = undefined                          ;
  const REPO_NAME = undefined                         ;
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    if (body.message && body.message.document) {
      const fileId = body.message.document.file_id;
      const fileName = body.message.document.file_name;
      console.log(`Received file: ${fileName}`);
      const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileInfo = await fileResponse.json();
      if (!fileInfo.ok) {
        throw new Error(fileInfo.description);
      }
      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
      const fileContent = await (await fetch(fileUrl)).text();
      const mutantsRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
        { headers: { "Authorization": `Bearer ${GITHUB_TOKEN}` } }
      );
      console.log(`Mutants API response: ${mutantsRes.status}`);
      if (!mutantsRes.ok) {
        const errorText = await mutantsRes.text();
        console.error(`GitHub API error: ${errorText}`);
        throw new Error(`Failed to load mutants.json: ${mutantsRes.status} - ${errorText}`);
      }
      const mutantsData = await mutantsRes.json();
      console.log(`Mutants data keys: ${Object.keys(mutantsData)}`);
      let mutantsJson;
      if (mutantsData.content && mutantsData.content.length > 0) {
        console.log(`Using content from API response`);
        mutantsJson = atob(mutantsData.content);
      } else if (mutantsData.download_url) {
        console.log(`Using download_url for large file`);
        const downloadRes = await fetch(mutantsData.download_url);
        if (!downloadRes.ok) {
          throw new Error(`Failed to download mutants.json: ${downloadRes.status}`);
        }
        mutantsJson = await downloadRes.text();
        console.log(`Downloaded ${mutantsJson.length} bytes`);
        console.log(`First 100 chars: ${mutantsJson.slice(0, 100)}`);
        console.log(`Last 100 chars: ${mutantsJson.slice(-100)}`);
      } else {
        throw new Error("No content or download_url available for mutants.json");
      }
      console.log(`Mutants JSON length: ${mutantsJson.length}`);
      const { parseTierData } = await import('../../chunks/tier-parser_BuyCCdDk.mjs');
      console.log(`Calling parseTierData with fileContent length: ${fileContent.length}, mutantsJson length: ${mutantsJson.length}`);
      const parsedTiers = parseTierData(fileContent, mutantsJson);
      console.log(`Parsed tiers: ${JSON.stringify(parsedTiers, null, 2).slice(0, 1e3)}`);
      console.log(`Total parsed: ${Object.keys(parsedTiers).length}`);
      const VALID_TIERS = ["1", "1+", "1-", "2", "2+", "2-", "3", "3+", "3-", "4", "un-tired"];
      for (const [mutantId, tier] of Object.entries(parsedTiers)) {
        if (!VALID_TIERS.includes(tier)) {
          return new Response(JSON.stringify({ error: `Invalid tier: ${tier}` }), { status: 400 });
        }
      }
      if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME) ;
      return new Response(JSON.stringify({ success: true, count: Object.keys(parsedTiers).length }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
