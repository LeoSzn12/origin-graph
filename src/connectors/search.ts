import { createHash } from "node:crypto";
import { safeFetchMetadata } from "@/security/fetch";

export interface ExternalCandidate {
  external_id: string;
  record_type: string;
  title: string;
  subtitle?: string;
  canonical_url?: string;
  date_label?: string;
  creators: string[];
  places: string[];
  subjects: string[];
  rights_uri?: string;
  rights_lane: "green" | "yellow" | "red";
  rights_note: string;
  safe_summary?: string;
  raw_metadata: Record<string, unknown>;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => typeof item === "string" ? [item] : []).slice(0, 20);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function crossrefDate(value:unknown):string|undefined{
  if(!value||typeof value!=="object")return undefined;
  const parts=(value as {"date-parts"?:unknown})["date-parts"];
  if(!Array.isArray(parts)||!Array.isArray(parts[0]))return undefined;
  return (parts[0] as unknown[]).filter(part=>typeof part==="number").join("-")||undefined;
}

async function json(url: string): Promise<Record<string, unknown>> {
  const response = await safeFetchMetadata(url);
  const parsed = JSON.parse(new TextDecoder().decode(response.content));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("CONNECTOR_RESPONSE_INVALID: expected a JSON object");
  return parsed as Record<string, unknown>;
}

async function stringResponse(url: string): Promise<string> {
  const response = await safeFetchMetadata(url);
  return new TextDecoder().decode(response.content);
}

function cleanMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
}

function compactRaw(value: Record<string, unknown>): Record<string, unknown> {
  const serialized = JSON.stringify(value);
  if (serialized.length <= 60_000) return value;
  return { truncated: true, source_hash: createHash("sha256").update(serialized).digest("hex") };
}

export async function searchProvider(providerKey: string, query: string, limit = 12): Promise<ExternalCandidate[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 25));
  if (providerKey === "gutenberg") {
    const xml = await stringResponse(`https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(query)}`);
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
    return entries.flatMap((entry): ExternalCandidate[] => {
      const id = entry.match(/<id>https:\/\/www\.gutenberg\.org\/ebooks\/(\d+)\.opds<\/id>/)?.[1];
      const titleValue = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
      if (!id || !titleValue) return [];
      const content = cleanMarkup(entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? "");
      return [{ external_id:id,record_type:"public_domain_ebook",title:cleanMarkup(titleValue),canonical_url:`https://www.gutenberg.org/ebooks/${id}`,
        creators:content && !/downloads?$/i.test(content) ? [content] : [],places:[],subjects:["Project Gutenberg ebook"],
        rights_uri:"https://www.gutenberg.org/policy/license.html",rights_lane:"green",
        rights_note:"Project Gutenberg catalog metadata is public domain. Review the ebook's embedded license and jurisdiction before importing or publishing edition text.",
        safe_summary:content || `Project Gutenberg ebook ${id}.`,raw_metadata:{ebook_id:id,opds:`https://www.gutenberg.org/ebooks/${id}.opds`,catalog_license:"public domain",jurisdiction_note:"Project Gutenberg provides United States copyright guidance; users outside the United States must review local law."} }];
    }).slice(0,boundedLimit);
  }
  if (providerKey === "wikipedia" || providerKey === "wikisource") {
    const host = providerKey === "wikipedia" ? "en.wikipedia.org" : "en.wikisource.org";
    const payload = await json(`https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${boundedLimit}&srprop=snippet%7Ctimestamp%7Cwordcount&utf8=1&format=json&formatversion=2`);
    const queryRecord = payload.query as Record<string,unknown> | undefined;
    const results = Array.isArray(queryRecord?.search) ? queryRecord.search as Record<string,unknown>[] : [];
    return results.map((item) => {
      const pageTitle = text(item.title) ?? "Untitled Wikimedia page";
      const revisionTimestamp = text(item.timestamp);
      const pageUrl = `https://${host}/wiki/${encodeURIComponent(pageTitle.replace(/ /g,"_"))}`;
      return { external_id:String(item.pageid ?? pageTitle),record_type:providerKey === "wikipedia" ? "reference_article" : "source_text_page",title:pageTitle,
        canonical_url:pageUrl,date_label:revisionTimestamp,creators:[`${providerKey === "wikipedia" ? "Wikipedia" : "Wikisource"} contributors`],places:[],subjects:[],
        rights_uri:"https://creativecommons.org/licenses/by-sa/4.0/",rights_lane:"yellow",
        rights_note:providerKey === "wikipedia" ? "CC BY-SA reference lead only; verify cited primary and scholarly sources before using factual claims." : "Review the page edition, source scan, and page-level license before passage ingestion; preserve revision and contributor attribution.",
        safe_summary:cleanMarkup(text(item.snippet) ?? "").slice(0,1000),raw_metadata:compactRaw({pageid:item.pageid,title:pageTitle,timestamp:revisionTimestamp,wordcount:item.wordcount,host,license:"CC BY-SA",attribution_required:true}) };
    });
  }
  if (providerKey === "wikidata") {
    const payload = await json(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&uselang=en&type=item&limit=${boundedLimit}&format=json`);
    const results = Array.isArray(payload.search) ? payload.search as Record<string,unknown>[] : [];
    return results.map((item) => ({ external_id:text(item.id) ?? String(item.pageid),record_type:"entity_record",title:text(item.label) ?? text(item.id) ?? "Unnamed Wikidata entity",
      subtitle:text(item.description),canonical_url:text(item.concepturi) ?? `https://www.wikidata.org/wiki/${text(item.id)}`,creators:["Wikidata contributors"],places:[],subjects:[],
      rights_uri:"https://creativecommons.org/publicdomain/zero/1.0/",rights_lane:"green",rights_note:"CC0 structured entity metadata; dates and specialist claims still require source verification.",
      safe_summary:text(item.description),raw_metadata:compactRaw(item) }));
  }
  if (providerKey === "crossref") {
    const payload = await json(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${boundedLimit}`);
    const message = payload.message as Record<string, unknown> | undefined;
    const items = Array.isArray(message?.items) ? message.items as Record<string, unknown>[] : [];
    return items.map((item) => {
      const title = strings(item.title)[0] ?? "Untitled Crossref work";
      const authors = Array.isArray(item.author) ? (item.author as Record<string,unknown>[]).map((author) => [text(author.given),text(author.family)].filter(Boolean).join(" ")).filter(Boolean) : [];
      const licenses = Array.isArray(item.license) ? item.license as Record<string,unknown>[] : [];
      return { external_id:text(item.DOI) ?? text(item.URL) ?? title,record_type:text(item.type) ?? "scholarly_work",title,
        canonical_url:text(item.URL),date_label:crossrefDate(item.published ?? item.issued),creators:authors,places:[],subjects:strings(item.subject),
        rights_uri:text(licenses[0]?.URL),rights_lane:"yellow",rights_note:"Bibliographic metadata only; publisher work-level rights require review.",
        safe_summary:text(item.abstract)?.replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,1000),raw_metadata:compactRaw(item) };
    });
  }
  if (providerKey === "loc") {
    const payload = await json(`https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fo=json&c=${boundedLimit}`);
    const items = Array.isArray(payload.results) ? payload.results as Record<string, unknown>[] : [];
    return items.map((item) => ({ external_id:text(item.id) ?? text(item.url) ?? String(item.title),record_type:strings(item.original_format)[0] ?? "collection_item",
      title:text(item.title) ?? "Untitled Library of Congress item",subtitle:text(item.description)?.slice(0,300),canonical_url:text(item.id) ?? text(item.url),
      date_label:text(item.date),creators:strings(item.contributor).concat(strings(item.creator)),places:strings(item.location),subjects:strings(item.subject),
      rights_uri:text(item.rights),rights_lane:"yellow",rights_note:"Library metadata staged; item rights statement requires review before media or text publication.",
      safe_summary:text(item.description)?.slice(0,1000),raw_metadata:compactRaw(item) }));
  }
  if (providerKey === "noaa_paleo") {
    const payload = await json(`https://www.ncei.noaa.gov/access/paleo-search/study/search.json?searchText=${encodeURIComponent(query)}&limit=${boundedLimit}`);
    const items = Array.isArray(payload.study) ? payload.study as Record<string, unknown>[] : [];
    return items.map((item) => {
      const site = Array.isArray(item.site) ? (item.site as Record<string,unknown>[])[0] : undefined;
      return { external_id:String(item.studyId ?? item.xmlId ?? item.doi ?? item.studyName),record_type:"paleoclimate_study",title:text(item.studyName) ?? text(item.title) ?? "Untitled paleoclimate study",
        canonical_url:text(item.onlineResourceLink) ?? text(item.doi),date_label:text(item.pubYear),creators:strings(item.investigators),places:site ? [text(site.siteName) ?? ""].filter(Boolean) : [],
        subjects:strings(item.dataType).concat(strings(item.studyNotes)),rights_lane:"green",rights_note:"NOAA study metadata; preserve dataset investigators, methods, and download attribution.",
        safe_summary:text(item.studyNotes)?.slice(0,1000),raw_metadata:compactRaw(item) };
    });
  }
  if (providerKey === "paleobiodb") {
    const payload = await json(`https://paleobiodb.org/data1.2/occs/list.json?base_name=${encodeURIComponent(query)}&limit=${boundedLimit}&show=coords,time,strat,ref`);
    const records = Array.isArray(payload.records) ? payload.records as Record<string, unknown>[] : [];
    return records.map((item) => ({ external_id:String(item.oid ?? item.cid ?? item.tid),record_type:"fossil_occurrence",title:text(item.tna) ?? text(item.idn) ?? `Occurrence ${item.oid}`,
      canonical_url:`https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${item.cid ?? ""}`,date_label:[item.eag,item.lag].filter((value)=>value!==undefined).join("–"),creators:[],
      places:[text(item.cc2),text(item.sna)].filter(Boolean) as string[],subjects:[text(item.oei),text(item.oli),text(item.tei)].filter(Boolean) as string[],rights_lane:"green",
      rights_note:"PBDB occurrence metadata; preserve collection/reference attribution and geological uncertainty.",safe_summary:text(item.rid),raw_metadata:compactRaw(item) }));
  }
  if (providerKey === "internet_archive") {
    const fields = ["identifier","title","creator","date","description","subject","licenseurl","mediatype"].map((field)=>`fl[]=${field}`).join("&");
    const payload = await json(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&${fields}&rows=${boundedLimit}&output=json`);
    const response = payload.response as Record<string, unknown> | undefined;
    const docs = Array.isArray(response?.docs) ? response.docs as Record<string, unknown>[] : [];
    return docs.map((item) => ({ external_id:String(item.identifier),record_type:text(item.mediatype) ?? "archive_item",title:text(item.title) ?? String(item.identifier),
      canonical_url:`https://archive.org/details/${item.identifier}`,date_label:text(item.date),creators:strings(Array.isArray(item.creator)?item.creator:[item.creator]),places:[],subjects:strings(Array.isArray(item.subject)?item.subject:[item.subject]),
      rights_uri:text(item.licenseurl),rights_lane:"yellow",rights_note:"Discovery metadata only. Archive availability is not proof of public-domain status.",safe_summary:text(item.description)?.replace(/<[^>]+>/g," ").slice(0,1000),raw_metadata:compactRaw(item) }));
  }
  if (providerKey === "pleiades") {
    if (!/^\d+$/.test(query.trim())) throw new Error("QUERY_FORMAT: Pleiades lookup currently requires a numeric place ID");
    const item = await json(`https://pleiades.stoa.org/places/${query.trim()}/json`);
    return [{ external_id:query.trim(),record_type:"ancient_place",title:text(item.title) ?? `Pleiades ${query.trim()}`,canonical_url:text(item.uri) ?? `https://pleiades.stoa.org/places/${query.trim()}`,
      creators:[],places:[],subjects:strings(item.featureTypes),rights_uri:"https://creativecommons.org/licenses/by/3.0/",rights_lane:"green",rights_note:"Pleiades data with required contributor attribution.",
      safe_summary:text(item.description)?.replace(/<[^>]+>/g," ").slice(0,1000),raw_metadata:compactRaw(item) }];
  }
  if (providerKey === "sefaria") {
    const item = await json(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(query)}?version=primary&return_format=text_only`);
    const versions = Array.isArray(item.versions) ? item.versions as Record<string,unknown>[] : [];
    const versionMetadata = versions.map(({ text: _text, ...metadata }) => metadata);
    return [{ external_id:text(item.ref) ?? query,record_type:"text_reference",title:text(item.ref) ?? query,canonical_url:`https://www.sefaria.org/${encodeURIComponent(text(item.ref) ?? query)}`,
      creators:[],places:[],subjects:[],rights_lane:"yellow",rights_note:"Exact reference preview only. Select and review a named Sefaria version and its license before storing text.",
      safe_summary:`${versionMetadata.length} primary version record(s) available for license review.`,raw_metadata:compactRaw({ ref:item.ref,heRef:item.heRef,versions:versionMetadata }) }];
  }
  throw new Error("CONNECTOR_UNAVAILABLE: this provider is cataloged but does not yet expose a safe search adapter");
}
