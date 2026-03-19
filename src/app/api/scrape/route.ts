export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { url, description } = await request.json();

    if (!url || !description) {
      return Response.json(
        { error: "URL and description are required." },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return Response.json({ error: "Invalid URL." }, { status: 400 });
    }

    // Fetch the page
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return Response.json(
          { error: `Failed to fetch URL: HTTP ${res.status}` },
          { status: 422 }
        );
      }
      html = await res.text();
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out (15s)."
          : "Failed to fetch the URL. Check that it is accessible.";
      return Response.json({ error: message }, { status: 422 });
    }

    // Strip HTML to clean text
    let cleanText = html;
    // Remove script and style tags and their content
    cleanText = cleanText.replace(
      /<script[\s\S]*?<\/script>/gi,
      ""
    );
    cleanText = cleanText.replace(
      /<style[\s\S]*?<\/style>/gi,
      ""
    );
    // Remove nav, footer, header tags
    cleanText = cleanText.replace(
      /<nav[\s\S]*?<\/nav>/gi,
      ""
    );
    cleanText = cleanText.replace(
      /<footer[\s\S]*?<\/footer>/gi,
      ""
    );
    // Remove all HTML tags
    cleanText = cleanText.replace(/<[^>]+>/g, " ");
    // Decode common HTML entities
    cleanText = cleanText
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    // Collapse whitespace
    cleanText = cleanText.replace(/\s+/g, " ").trim();
    // Truncate to 6000 chars
    cleanText = cleanText.slice(0, 6000);

    // Call Groq
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return Response.json(
        { error: "Server configuration error: missing API key." },
        { status: 500 }
      );
    }

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a data extraction assistant. You receive webpage text and a description of what data to extract. Return ONLY a valid JSON array of objects. No markdown, no explanation, no code fences — just the raw JSON array.",
            },
            {
              role: "user",
              content: `Extract the following data from this webpage text: ${description}\n\nWebpage text:\n${cleanText}`,
            },
          ],
          temperature: 0,
          max_tokens: 4000,
        }),
      }
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", errText);
      return Response.json(
        { error: "AI extraction failed. Please try again." },
        { status: 502 }
      );
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content ?? "[]";

    // Parse the JSON from the response
    let data: Record<string, unknown>[];
    try {
      // Try to find JSON array in the response (sometimes LLMs wrap it)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return Response.json(
        {
          error: "Failed to parse AI response as JSON. Try a simpler query.",
          rawText: cleanText,
        },
        { status: 422 }
      );
    }

    return Response.json({ data, rawText: cleanText });
  } catch (err) {
    console.error("Unexpected error:", err);
    return Response.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
