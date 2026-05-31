#!/usr/bin/env python3
"""
LLM Token Pricing Scraper — multi-source edition.

Tier 1 (JSON APIs — reliable):
  OpenRouter      https://openrouter.ai/api/v1/models          300+ models
  LiteLLM DB      github.com/BerriAI/litellm (JSON file)       OpenAI, Anthropic,
                                                                Google, AWS Bedrock,
                                                                Azure OpenAI, Vertex,
                                                                Cohere, Mistral + 40 more
  Together AI     https://api.together.xyz/models

Tier 2 (HTML scrapers — best-effort, may break on site changes):
  Groq, Mistral, Fireworks AI, Perplexity, Cohere,
  AI21 Labs, DeepInfra, Cerebras

Output columns:
  timestamp, source, provider, model_id, model_name,
  context_length, input_per_million_usd, output_per_million_usd
"""

import csv
import json
import re
import sys
from datetime import datetime, timezone

# Windows cmd/PowerShell default to cp1252 — force UTF-8 so box-drawing chars work.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx

TIMEOUT = 30
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
FIELDNAMES = [
    "timestamp", "source", "provider", "model_id", "model_name",
    "context_length", "input_per_million_usd", "output_per_million_usd",
]


# ── helpers ───────────────────────────────────────────────────────────────────

def mkrow(ts, source, provider, model_id, model_name, ctx, inp, out):
    return {
        "timestamp": ts,
        "source": source,
        "provider": str(provider).strip(),
        "model_id": str(model_id).strip(),
        "model_name": str(model_name).strip(),
        "context_length": ctx if ctx is not None else "",
        "input_per_million_usd": round(float(inp), 6),
        "output_per_million_usd": round(float(out), 6),
    }


def get_json(client, url, label=""):
    try:
        r = client.get(url, timeout=TIMEOUT, headers=HEADERS, follow_redirects=True)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"    [warn] {label or url}: {e}")
        return None


def get_html(client, url, label=""):
    try:
        r = client.get(url, timeout=TIMEOUT, headers=HEADERS, follow_redirects=True)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"    [warn] {label or url}: {e}")
        return None


def extract_next_data(html):
    """Pull __NEXT_DATA__ JSON from Next.js SSR pages."""
    m = re.search(
        r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>\s*(\{.+?\})\s*</script>',
        html, re.DOTALL,
    )
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    return None


def dig(obj, *keys):
    """Safely traverse nested dicts/lists without KeyError/TypeError."""
    for k in keys:
        if obj is None:
            return None
        if isinstance(obj, dict):
            obj = obj.get(k)
        elif isinstance(obj, (list, tuple)) and isinstance(k, int):
            obj = obj[k] if 0 <= k < len(obj) else None
        else:
            return None
    return obj


def html_table_rows(html):
    """
    Return a list of [cell_text, ...] lists parsed from every <tr> in the HTML.
    Tags are stripped; whitespace is normalised.
    """
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL | re.IGNORECASE):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.DOTALL | re.IGNORECASE)
        clean = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", c)).strip() for c in cells]
        clean = [c for c in clean if c]
        if clean:
            rows.append(clean)
    return rows


def prices_from_cells(cells):
    """Return (inp, out) floats from the dollar amounts in a row of cells, or None."""
    amounts = re.findall(r"\$([\d,]+\.?\d*)", " ".join(cells))
    amounts = [float(a.replace(",", "")) for a in amounts]
    if len(amounts) >= 2:
        return amounts[-2], amounts[-1]
    return None


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def table_scraper(client, ts, url, source, provider_name):
    """
    Generic HTML table scraper.
    Expects rows where cell[0] is the model name and the last two $ amounts
    are input price then output price (per million tokens).
    """
    html = get_html(client, url, source)
    if not html:
        return []
    rows = []
    for cells in html_table_rows(html):
        pair = prices_from_cells(cells)
        if not pair:
            continue
        inp, out = pair
        if inp == 0 and out == 0:
            continue
        name = cells[0]
        if not name or name.lower() in ("model", "name", "model name"):
            continue
        ctx = ""
        for c in cells[1:]:
            if re.search(r"[\d,]+[kK]?\s*(tokens?|context|window)?$", c) and "$" not in c:
                ctx = c
                break
        mid = f"{provider_name}/{slug(name)}"
        rows.append(mkrow(ts, source, provider_name, mid, name, ctx, inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 1: OpenRouter  (JSON API)
# Covers: anthropic, openai, google, meta, mistral, cohere, + 50 more
# ═══════════════════════════════════════════════════════════════════════
def scrape_openrouter(client, ts):
    data = get_json(client, "https://openrouter.ai/api/v1/models", "OpenRouter")
    if not data:
        return []
    rows = []
    for m in data.get("data", []):
        mid = m.get("id", "")
        p = m.get("pricing") or {}
        try:
            inp = float(p.get("prompt", 0) or 0) * 1e6
            out = float(p.get("completion", 0) or 0) * 1e6
        except (TypeError, ValueError):
            continue
        if inp == 0 and out == 0:
            continue
        provider = mid.split("/")[0] if "/" in mid else ""
        rows.append(mkrow(ts, "openrouter", provider, mid,
                          m.get("name", ""), m.get("context_length", ""), inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 2: LiteLLM community pricing database  (GitHub raw JSON)
# Single file covering: openai, anthropic, google (gemini + vertex),
# aws bedrock, azure openai, cohere, mistral, groq, together, fireworks,
# deepinfra, replicate, huggingface, ollama, + ~40 more providers.
# This is the most comprehensive single source available.
# ═══════════════════════════════════════════════════════════════════════
_LITELLM_URL = (
    "https://raw.githubusercontent.com/BerriAI/litellm/main/"
    "model_prices_and_context_window.json"
)

def scrape_litellm(client, ts):
    data = get_json(client, _LITELLM_URL, "LiteLLM DB")
    if not data:
        return []
    rows = []
    for model_id, info in data.items():
        if not isinstance(info, dict):
            continue
        try:
            inp = float(info.get("input_cost_per_token", 0) or 0) * 1e6
            out = float(info.get("output_cost_per_token", 0) or 0) * 1e6
        except (TypeError, ValueError):
            continue
        if inp == 0 and out == 0:
            continue
        provider = info.get("litellm_provider", "")
        if not provider and "/" in model_id:
            provider = model_id.split("/")[0]
        ctx = info.get("max_input_tokens") or info.get("max_tokens", "")
        rows.append(mkrow(ts, "litellm", provider, model_id, model_id, ctx, inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 3: Together AI  (JSON API — no auth required)
# Large catalog of open-source models (Llama, Mistral, Falcon, DBRX…)
# ═══════════════════════════════════════════════════════════════════════
def scrape_together(client, ts):
    data = get_json(client, "https://api.together.ai/models", "Together AI")
    if not data:
        data = get_json(client, "https://api.together.xyz/models", "Together AI (fallback)")
    if not data:
        return []
    if isinstance(data, dict):
        data = data.get("data", data.get("models", []))
    rows = []
    for m in (data or []):
        if not isinstance(m, dict):
            continue
        mid = m.get("id", "")
        p = m.get("pricing") or {}
        try:
            inp = float(p.get("input", p.get("inputCost", 0)) or 0) * 1e6
            out = float(p.get("output", p.get("outputCost", 0)) or 0) * 1e6
        except (TypeError, ValueError):
            continue
        if inp == 0 and out == 0:
            continue
        provider = m.get("organization", mid.split("/")[0] if "/" in mid else "together")
        ctx = m.get("context_length", m.get("max_context_length", ""))
        name = m.get("display_name", m.get("name", mid))
        rows.append(mkrow(ts, "together", provider, mid, name, ctx, inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 4: Groq  (pricing page — Next.js SSR + table fallback)
# ═══════════════════════════════════════════════════════════════════════
def scrape_groq(client, ts):
    html = get_html(client, "https://groq.com/pricing/", "Groq")
    if not html:
        return []

    rows = []
    nd = extract_next_data(html)
    if nd:
        models = (
            dig(nd, "props", "pageProps", "models") or
            dig(nd, "props", "pageProps", "data", "models") or
            dig(nd, "props", "pageProps", "pricingData") or []
        )
        for m in (models or []):
            mid = m.get("id", m.get("model", m.get("model_id", "")))
            if not mid:
                continue
            try:
                inp = float(m.get("input", m.get("inputPrice", m.get("input_price", 0))) or 0)
                out = float(m.get("output", m.get("outputPrice", m.get("output_price", 0))) or 0)
            except (TypeError, ValueError):
                continue
            if inp == 0 and out == 0:
                continue
            ctx = m.get("context_window", m.get("context_length", ""))
            rows.append(mkrow(ts, "groq", "groq", mid, m.get("name", mid), ctx, inp, out))
        if rows:
            return rows

    # HTML table fallback
    for cells in html_table_rows(html):
        pair = prices_from_cells(cells)
        if not pair:
            continue
        inp, out = pair
        if inp == 0 and out == 0:
            continue
        name = cells[0]
        if not name or name.lower() in ("model", "name"):
            continue
        rows.append(mkrow(ts, "groq", "groq", f"groq/{slug(name)}", name, "", inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 5: Mistral AI  (pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_mistral(client, ts):
    html = get_html(client, "https://mistral.ai/technology/#pricing", "Mistral")
    if not html:
        return []

    rows = []
    nd = extract_next_data(html)
    if nd:
        models = (
            dig(nd, "props", "pageProps", "pricingModels") or
            dig(nd, "props", "pageProps", "models") or []
        )
        for m in (models or []):
            mid = m.get("id", m.get("model_id", ""))
            try:
                inp = float(m.get("input", m.get("inputPrice", 0)) or 0)
                out = float(m.get("output", m.get("outputPrice", 0)) or 0)
            except (TypeError, ValueError):
                continue
            if inp == 0 and out == 0:
                continue
            rows.append(mkrow(ts, "mistral", "mistral", mid, m.get("name", mid),
                              m.get("context_length", ""), inp, out))
        if rows:
            return rows

    for cells in html_table_rows(html):
        pair = prices_from_cells(cells)
        if not pair:
            continue
        inp, out = pair
        if inp == 0 and out == 0:
            continue
        name = cells[0]
        if not name or name.lower() in ("model", "name"):
            continue
        rows.append(mkrow(ts, "mistral", "mistral", f"mistral/{slug(name)}", name, "", inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 6: Fireworks AI  (pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_fireworks(client, ts):
    html = get_html(client, "https://fireworks.ai/pricing", "Fireworks AI")
    if not html:
        return []

    rows = []
    nd = extract_next_data(html)
    if nd:
        models = (
            dig(nd, "props", "pageProps", "models") or
            dig(nd, "props", "pageProps", "pricingData") or []
        )
        for m in (models or []):
            mid = m.get("id", m.get("modelId", ""))
            try:
                inp = float(m.get("input", m.get("inputPrice", 0)) or 0)
                out = float(m.get("output", m.get("outputPrice", 0)) or 0)
            except (TypeError, ValueError):
                continue
            if inp == 0 and out == 0:
                continue
            rows.append(mkrow(ts, "fireworks", "fireworks", mid, m.get("name", mid),
                              m.get("contextLength", ""), inp, out))
        if rows:
            return rows

    for cells in html_table_rows(html):
        pair = prices_from_cells(cells)
        if not pair:
            continue
        inp, out = pair
        if inp == 0 and out == 0:
            continue
        name = cells[0]
        if not name or name.lower() in ("model", "name"):
            continue
        rows.append(mkrow(ts, "fireworks", "fireworks", f"fireworks/{slug(name)}", name, "", inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 7: Perplexity AI  (docs pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_perplexity(client, ts):
    # Try current docs URL; Perplexity moves it occasionally
    for url in [
        "https://docs.perplexity.ai/guides/pricing",
        "https://docs.perplexity.ai/docs/pricing",
        "https://www.perplexity.ai/pricing",
    ]:
        rows = table_scraper(client, ts, url, "perplexity", "perplexity")
        if rows:
            return rows
    return []


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 8: Cohere  (pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_cohere(client, ts):
    html = get_html(client, "https://cohere.com/pricing", "Cohere")
    if not html:
        return []

    rows = []
    nd = extract_next_data(html)
    if nd:
        models = dig(nd, "props", "pageProps", "models") or []
        for m in (models or []):
            mid = m.get("id", "")
            try:
                inp = float(m.get("input", 0) or 0)
                out = float(m.get("output", 0) or 0)
            except (TypeError, ValueError):
                continue
            if inp == 0 and out == 0:
                continue
            rows.append(mkrow(ts, "cohere", "cohere", mid, m.get("name", mid), "", inp, out))
        if rows:
            return rows

    for cells in html_table_rows(html):
        pair = prices_from_cells(cells)
        if not pair:
            continue
        inp, out = pair
        if inp == 0 and out == 0:
            continue
        name = cells[0]
        if not name or name.lower() in ("model", "name"):
            continue
        rows.append(mkrow(ts, "cohere", "cohere", f"cohere/{slug(name)}", name, "", inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 9: AI21 Labs  (pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_ai21(client, ts):
    return table_scraper(
        client, ts,
        "https://www.ai21.com/pricing",
        "ai21", "ai21",
    )


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 10: DeepInfra  (pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_deepinfra(client, ts):
    html = get_html(client, "https://deepinfra.com/pricing", "DeepInfra")
    if not html:
        return []

    rows = []
    nd = extract_next_data(html)
    if nd:
        models = (
            dig(nd, "props", "pageProps", "models") or
            dig(nd, "props", "pageProps", "data") or []
        )
        for m in (models or []):
            mid = m.get("model_name", m.get("id", ""))
            try:
                inp = float(m.get("cents_per_input_token", m.get("input", 0)) or 0)
                out = float(m.get("cents_per_output_token", m.get("output", 0)) or 0)
            except (TypeError, ValueError):
                continue
            if inp == 0 and out == 0:
                continue
            # DeepInfra sometimes stores prices in cents/token → convert to $/M
            if inp < 1:
                inp *= 1e6
            if out < 1:
                out *= 1e6
            rows.append(mkrow(ts, "deepinfra", "deepinfra", mid, m.get("name", mid),
                              m.get("max_tokens", ""), inp, out))
        if rows:
            return rows

    for cells in html_table_rows(html):
        pair = prices_from_cells(cells)
        if not pair:
            continue
        inp, out = pair
        if inp == 0 and out == 0:
            continue
        name = cells[0]
        if not name or name.lower() in ("model", "name"):
            continue
        rows.append(mkrow(ts, "deepinfra", "deepinfra", f"deepinfra/{slug(name)}", name, "", inp, out))
    return rows


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 11: Cerebras  (inference pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_cerebras(client, ts):
    return table_scraper(
        client, ts,
        "https://cerebras.ai/inference",
        "cerebras", "cerebras",
    )


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 12: NovitaAI  (open-source model hosting)
# ═══════════════════════════════════════════════════════════════════════
def scrape_novita(client, ts):
    # Try their JSON pricing endpoint first
    data = get_json(client, "https://novita.ai/llm-api/pricing", "NovitaAI JSON")
    if data:
        models = data if isinstance(data, list) else data.get("data", data.get("models", []))
        rows = []
        for m in (models or []):
            if not isinstance(m, dict):
                continue
            mid = m.get("id", m.get("model_name", ""))
            p = m.get("pricing", m.get("price", {})) or {}
            try:
                inp = float(p.get("input", p.get("prompt", 0)) or 0) * 1e6
                out = float(p.get("output", p.get("completion", 0)) or 0) * 1e6
            except (TypeError, ValueError):
                continue
            if inp == 0 and out == 0:
                continue
            rows.append(mkrow(ts, "novita", "novita", mid,
                              m.get("name", m.get("display_name", mid)), "", inp, out))
        if rows:
            return rows

    return table_scraper(
        client, ts,
        "https://novita.ai/model-api/pricing",
        "novita", "novita",
    )


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 13: Hyperbolic  (inference pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_hyperbolic(client, ts):
    return table_scraper(
        client, ts,
        "https://app.hyperbolic.xyz/models",
        "hyperbolic", "hyperbolic",
    )


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 14: SambaNova  (inference pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_sambanova(client, ts):
    return table_scraper(
        client, ts,
        "https://cloud.sambanova.ai/apis",
        "sambanova", "sambanova",
    )


# ═══════════════════════════════════════════════════════════════════════
# SOURCE 15: Lepton AI  (inference pricing page)
# ═══════════════════════════════════════════════════════════════════════
def scrape_lepton(client, ts):
    for url in [
        "https://www.lepton.ai/pricing",
        "https://www.nvidia.com/en-us/data-center/dgx-cloud-lepton/",
    ]:
        rows = table_scraper(client, ts, url, "lepton", "lepton")
        if rows:
            return rows
    return []


# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

SOURCES = [
    # Tier 1 — JSON APIs (high reliability, broad coverage)
    ("OpenRouter",       scrape_openrouter),
    ("LiteLLM DB",       scrape_litellm),
    ("Together AI",      scrape_together),
    # Tier 2 — HTML scrapers (best-effort; may return 0 on JS-only sites)
    ("Groq",             scrape_groq),
    ("Mistral",          scrape_mistral),
    ("Fireworks AI",     scrape_fireworks),
    ("Perplexity",       scrape_perplexity),
    ("Cohere",           scrape_cohere),
    ("AI21 Labs",        scrape_ai21),
    ("DeepInfra",        scrape_deepinfra),
    ("Cerebras",         scrape_cerebras),
    ("NovitaAI",         scrape_novita),
    ("Hyperbolic",       scrape_hyperbolic),
    ("SambaNova",        scrape_sambanova),
    ("Lepton AI",        scrape_lepton),
]


def main():
    now = datetime.now(timezone.utc)
    ts    = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    fname = f"token_prices_{now.strftime('%Y%m%d_%H%M%S')}.csv"

    print(f"Scraping {len(SOURCES)} sources  [{ts}]\n")

    all_rows: list[dict] = []
    counts:   dict[str, int] = {}

    with httpx.Client(follow_redirects=True, timeout=TIMEOUT) as client:
        for name, scraper in SOURCES:
            print(f"  [{name}]")
            try:
                rows = scraper(client, ts)
                all_rows.extend(rows)
                counts[name] = len(rows)
                if rows:
                    print(f"    -> {len(rows)} models")
                else:
                    print(f"    -> 0 models (site may require JS rendering)")
            except Exception as e:
                print(f"    [ERROR] {e}")
                counts[name] = 0

    # Deduplicate within each source by model_id
    seen: set[tuple[str, str]] = set()
    deduped: list[dict] = []
    for r in all_rows:
        key = (r["source"], r["model_id"])
        if key not in seen:
            seen.add(key)
            deduped.append(r)

    with open(fname, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(deduped)

    unique_providers = len({r["provider"] for r in deduped if r["provider"]})
    total_by_src     = sum(counts.values())

    print()
    print("─" * 56)
    print(f"  Timestamp  : {ts}")
    print(f"  Output     : {fname}")
    print(f"  Total rows : {len(deduped)}  (deduped from {total_by_src} raw)")
    print(f"  Providers  : {unique_providers}")
    print()
    width = max(len(n) for n in counts)
    for name, count in counts.items():
        marker = "✓" if count > 0 else "✗"
        note   = "" if count > 0 else "  ← JS-rendered or no pricing table found"
        print(f"  {marker} {name:<{width}}  {count:>5} models{note}")
    print("─" * 56)


if __name__ == "__main__":
    main()
