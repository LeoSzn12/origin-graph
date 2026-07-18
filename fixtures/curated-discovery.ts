export interface CuratedDiscoveryQuery{caseFile:string;provider:string;query:string;relevance:string;}
export const curatedDiscoveryQueries:CuratedDiscoveryQuery[]=[
  {caseFile:"flood-traditions-atlas",provider:"gutenberg",query:"flood mythology deluge",relevance:"Public-domain editions and historical translations for flood-tradition comparison."},
  {caseFile:"flood-traditions-atlas",provider:"crossref",query:"comparative flood traditions paleoflood",relevance:"Scholarly bibliography for transmission, chronology, and regional-flood interpretations."},
  {caseFile:"sumerian-king-list-long-reigns",provider:"crossref",query:"Sumerian King List antediluvian reigns",relevance:"Scholarly editions and interpretations of the King List and its numerical structure."},
  {caseFile:"sumerian-king-list-long-reigns",provider:"wikipedia",query:"Sumerian King List",relevance:"Reference lead whose bibliography must be verified against primary editions."},
  {caseFile:"atlantis-in-plato",provider:"gutenberg",query:"Timaeus Plato",relevance:"Public-domain Plato editions for edition selection and exact passage review."},
  {caseFile:"atlantis-in-plato",provider:"wikisource",query:"Critias Plato Atlantis",relevance:"Wikisource edition candidates with revision and contributor attribution."},
  {caseFile:"african-humid-period",provider:"noaa_paleo",query:"African Humid Period Sahara",relevance:"Government-hosted paleoclimate study and dataset metadata."},
  {caseFile:"african-humid-period",provider:"crossref",query:"African Humid Period Green Sahara paleoclimate",relevance:"Scholarly bibliography spanning proxy, model, and archaeological interpretations."},
  {caseFile:"sphinx-chronology",provider:"crossref",query:"Great Sphinx chronology erosion geology",relevance:"Scholarly and technical sources for mainstream and alternate chronology arguments."},
  {caseFile:"sphinx-chronology",provider:"loc",query:"Great Sphinx Giza archaeology",relevance:"Library catalog records and historical documentation."},
  {caseFile:"younger-dryas",provider:"noaa_paleo",query:"Younger Dryas",relevance:"Paleoclimate studies and datasets for the securely measured climate interval."},
  {caseFile:"younger-dryas",provider:"crossref",query:"Younger Dryas impact hypothesis counterevidence",relevance:"Bibliography containing both impact-hypothesis and critical research."},
  {caseFile:"deep-human-timeline",provider:"paleobiodb",query:"Homo",relevance:"Empirical fossil occurrence records; interpretation remains separate."},
  {caseFile:"deep-human-timeline",provider:"crossref",query:"Homo sapiens origins migration chronology",relevance:"Scholarly bibliography for fossil, archaeological, and genetic evidence."},
  {caseFile:"watchers-giants-hybrid-beings",provider:"gutenberg",query:"Enoch",relevance:"Public-domain historical translations for edition and locator review."},
  {caseFile:"watchers-giants-hybrid-beings",provider:"wikisource",query:"Book of Enoch Watchers",relevance:"Open source-text candidates and edition history."},
  {caseFile:"vimanas-sky-vehicles",provider:"gutenberg",query:"Mahabharata",relevance:"Public-domain Mahabharata volumes and older translations requiring terminology review."},
  {caseFile:"vimanas-sky-vehicles",provider:"crossref",query:"vimana Sanskrit textual history",relevance:"Philological and historical bibliography to distinguish textual periods and terms."},
  {caseFile:"divine-astral-weapons",provider:"gutenberg",query:"Mahabharata",relevance:"Public-domain epic translations for exact section and term review."},
  {caseFile:"divine-astral-weapons",provider:"crossref",query:"Mahabharata astra weapons translation",relevance:"Philological bibliography and modern-analogy source genealogy."}
];
