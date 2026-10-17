import { useState, type FormEvent } from 'react';
import { suggestCollectionCategory, type StoreCollectionCategory } from '../lib/collectionSuggestions';
import {
  findStoreCollectionGroup,
  manualStoreCollectionAssignment,
  storeCollectionGroups,
  suggestStoreCollection,
  type StoreCollectionAssignment,
} from '../lib/storeCollectionTaxonomy';

interface SearchProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  sellPriceUsd: number | null;
  discountPriceUsd: number | null;
  listedCount: number | null;
  inventoryTotal: number | null;
  verifiedInventory: number | null;
  category: string;
  freeShippingFlag: boolean | null;
  saleStatus: string;
  deliveryCycle: string;
}
interface Inventory {
  countryCode: string;
  total: number | null;
  cjStock: number | null;
  factoryStock: number | null;
  verifiedWarehouse: boolean;
}
interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  sellPriceUsd: number | null;
  description: string;
  saleStatus: string;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    options: string;
    sellPriceUsd: number | null;
    inventory: Inventory[];
  }>;
}
interface NeedsReviewProduct {
  id: string;
  title: string;
  currentCollection?: string;
  currentCollectionLabel?: string;
  currentSubcategory?: string;
  currentSubcategoryLabel?: string;
}
interface CategorySelection {
  collection: string;
  subcategory: string;
}
interface SearchResponse {
  ok?: boolean;
  error?: string;
  items?: SearchProduct[];
  totalRecords?: number;
  detail?: ProductDetail;
  productId?: string;
  alreadyImported?: boolean;
  status?: string;
  message?: string;
  imageCount?: number;
  variantCount?: number;
  scannedCount?: number;
  movedCount?: number;
  alreadyCorrectCount?: number;
  needsReviewCount?: number;
  needsReview?: NeedsReviewProduct[];
  moved?: Array<{ id: string; title: string; collection: string; subcategory?: string }>;
  assignedCount?: number;
  product?: { id: string; title: string; storeCollectionLabel?: string; storeSubcategoryLabel?: string };
}
const money = (value: number | null) => value === null ? 'Not supplied' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(value);

export function CJCatalogAdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [keyword, setKeyword] = useState("Elegant Vintage Women's Boho Tassel Dress");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [details, setDetails] = useState<Record<string, ProductDetail>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [collectionAssignments] = useState<Record<string, StoreCollectionCategory>>({});
  const [storeAssignments, setStoreAssignments] = useState<Record<string, CategorySelection>>({});
  const [needsReviewProducts, setNeedsReviewProducts] = useState<NeedsReviewProduct[]>([]);
  const [reviewAssignments, setReviewAssignments] = useState<Record<string, CategorySelection>>({});
  const [importedIds, setImportedIds] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [batchProgress, setBatchProgress] = useState('');
  const [multiKeywords, setMultiKeywords] = useState('plus size dress, curvy dress, wedding guest dress, cocktail dress, evening gown');
  const [pagesPerTerm, setPagesPerTerm] = useState(2);
  const [multiSearchProgress, setMultiSearchProgress] = useState('');

  function collectionFor(product: SearchProduct): StoreCollectionCategory | undefined {
    return collectionAssignments[product.id]
      ?? suggestCollectionCategory(product.name, product.category, details[product.id]?.description);
  }

  function storeCollectionFor(product: SearchProduct): StoreCollectionAssignment | undefined {
    const selected = storeAssignments[product.id];
    if (selected) {
      return selected.collection && selected.subcategory
        ? manualStoreCollectionAssignment(selected.collection, selected.subcategory)
        : undefined;
    }
    return suggestStoreCollection(product.name, product.category, details[product.id]?.description);
  }

  function reviewCollectionFor(product: NeedsReviewProduct): StoreCollectionAssignment | undefined {
    const selected = reviewAssignments[product.id];
    if (selected) {
      return selected.collection && selected.subcategory
        ? manualStoreCollectionAssignment(selected.collection, selected.subcategory)
        : undefined;
    }
    return product.currentCollection && product.currentSubcategory
      ? manualStoreCollectionAssignment(product.currentCollection, product.currentSubcategory)
      : undefined;
  }

  async function readJson(response: Response): Promise<SearchResponse> {
    const data = await response.json() as SearchResponse;
    if (!response.ok) throw new Error(data.error || (response.status === 401 ? 'Admin password was not accepted.' : 'CJ request failed.'));
    return data;
  }

  async function organizeExistingDresses() {
    setError('');
    setMessage('');
    if (!adminPassword) {
      setError('Enter the Davinova admin password configured in Cloudflare first.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/cj-organize-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({}),
        cache: 'no-store',
      });
      const data = await readJson(response);
      setNeedsReviewProducts(data.needsReview ?? []);
      setReviewAssignments({});
      setMessage(
        `Checked ${data.scannedCount ?? 0} existing imported CJ products: sorted ${data.movedCount ?? 0} into the clothing collections you supplied, ${data.alreadyCorrectCount ?? 0} already matched, and ${data.needsReviewCount ?? 0} need a manual collection/subcategory choice. No products were imported again.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not organize existing dresses.');
    } finally {
      setBusy(false);
    }
  }

  async function saveReviewAssignment(product: NeedsReviewProduct) {
    const assignment = reviewCollectionFor(product);
    if (!assignment?.subcategory) {
      setError('Choose a clothing collection and subcategory before saving this product.');
      return;
    }
    if (!adminPassword) {
      setError('Enter the Davinova admin password configured in Cloudflare first.');
      return;
    }
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/cj-organize-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({
          action: 'assign',
          productId: product.id,
          storeCollection: assignment.collection,
          storeSubcategory: assignment.subcategory,
        }),
        cache: 'no-store',
      });
      const data = await readJson(response);
      setNeedsReviewProducts((current) => current.filter((item) => item.id !== product.id));
      setReviewAssignments((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      setMessage(`Assigned “${product.title}” to ${data.product?.storeCollectionLabel ?? assignment.collectionLabel} → ${data.product?.storeSubcategoryLabel ?? assignment.subcategoryLabel}. No product was imported again.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the product category.');
    } finally {
      setBusy(false);
    }
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setMessage('');
    if (!adminPassword) {
      setError('Enter the Davinova admin password configured in Cloudflare first.');
      return;
    }
    if (keyword.trim().length < 2) {
      setError('Enter at least two characters to search.');
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams({ q: keyword.trim(), page: '1', size: '10' });
      const response = await fetch('/api/admin/cj-catalog?' + params.toString(), {
        headers: { 'x-admin-password': adminPassword },
        cache: 'no-store',
      });
      const data = await readJson(response);
      setResults(data.items ?? []);
      setTotal(data.totalRecords ?? data.items?.length ?? 0);
      setPage(1);
      setHasMore((data.items?.length ?? 0) < (data.totalRecords ?? data.items?.length ?? 0));
      setDetails({});
      setSelectedIds({});
      setBatchProgress('');
      setMessage('Read-only search finished. No products were imported and no orders were placed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not search CJ right now.');
    } finally {
      setBusy(false);
    }
  }

  async function loadMoreResults() {
    if (!adminPassword || !hasMore || busy) return;
    setError('');
    setMessage('');
    setBusy(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams({ q: keyword.trim(), page: String(nextPage), size: '10' });
      const response = await fetch('/api/admin/cj-catalog?' + params.toString(), {
        headers: { 'x-admin-password': adminPassword },
        cache: 'no-store',
      });
      const data = await readJson(response);
      const incoming = data.items ?? [];
      setResults((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...incoming.filter((item) => !seen.has(item.id))];
      });
      const totalRecords = data.totalRecords ?? total;
      setTotal(totalRecords);
      setPage(nextPage);
      setHasMore(nextPage * 10 < totalRecords && incoming.length > 0);
      setMessage(incoming.length ? `Loaded ${incoming.length} more dresses. You can now select from all ${Math.min(nextPage * 10, totalRecords)} loaded results.` : 'No more products were returned for this search.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more CJ products.');
    } finally {
      setBusy(false);
    }
  }

  async function searchMultipleTerms(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setMessage('');
    if (!adminPassword) {
      setError('Enter the Davinova admin password configured in Cloudflare first.');
      return;
    }
    const terms = [...new Set(
      multiKeywords.split(/[,\n]/).map((term) => term.trim()).filter((term) => term.length >= 2 && term.length <= 100),
    )].slice(0, 15);
    if (terms.length === 0) {
      setError('Enter at least one search term (2-100 characters), separated by commas or new lines.');
      return;
    }
    const pages = Math.min(5, Math.max(1, Math.round(pagesPerTerm) || 1));

    setBusy(true);
    setResults([]);
    setDetails({});
    setSelectedIds({});
    setHasMore(false);
    const merged: SearchProduct[] = [];
    const seen = new Set<string>();
    const failures: string[] = [];
    let fetched = 0;
    const totalCalls = terms.length * pages;

    try {
      for (const term of terms) {
        for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
          fetched += 1;
          setMultiSearchProgress(`Searching "${term}" (page ${pageNumber} of ${pages}) · call ${fetched} of ${totalCalls}`);
          try {
            const params = new URLSearchParams({ q: term, page: String(pageNumber), size: '10' });
            const response = await fetch('/api/admin/cj-catalog?' + params.toString(), {
              headers: { 'x-admin-password': adminPassword },
              cache: 'no-store',
            });
            const data = await readJson(response);
            const items = data.items ?? [];
            for (const item of items) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                merged.push(item);
              }
            }
            setResults([...merged]);
            if (items.length === 0) break; // No more pages for this term.
          } catch (cause) {
            failures.push(`"${term}" page ${pageNumber}: ${cause instanceof Error ? cause.message : 'search failed'}`);
          }
        }
      }
      setTotal(merged.length);
      const summary = [`Found ${merged.length} unique dress(es) across ${terms.length} search term(s).`];
      if (failures.length) summary.push(`${failures.length} search call(s) failed: ${failures.join(' | ')}`);
      setMessage(summary.join(' '));
    } finally {
      setMultiSearchProgress('');
      setBusy(false);
    }
  }

  async function loadDetails(product: SearchProduct) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const params = new URLSearchParams({ pid: product.id });
      const response = await fetch('/api/admin/cj-catalog?' + params.toString(), {
        headers: { 'x-admin-password': adminPassword },
        cache: 'no-store',
      });
      const data = await readJson(response);
      if (!data.detail) throw new Error('CJ returned no product details.');
      setDetails((current) => ({ ...current, [product.id]: data.detail! }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load product variants.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(product: SearchProduct) {
    setError('');
    setMessage('');
    if (!adminPassword) {
      setError('Enter the Davinova admin password first.');
      return;
    }
    if (!details[product.id]) {
      setError('Inspect the product variants before saving it as a draft.');
      return;
    }
    const assignedCollection = collectionFor(product);
    const assignedStore = storeCollectionFor(product);
    if (!assignedStore?.subcategory) {
      setError('Choose a clothing collection and one of its subcategories before adding this product.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/cj-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({
          productId: product.id,
          collectionCategory: assignedCollection,
          storeCollection: assignedStore.collection,
          storeSubcategory: assignedStore.subcategory,
          storeCollectionManual: Boolean(storeAssignments[product.id]),
        }),
        cache: 'no-store',
      });
      const data = await readJson(response);
      setImportedIds((current) => ({ ...current, [product.id]: data.productId || product.id }));
      setMessage(data.status === 'already_verified'
        ? 'This listing is already supplier-verified, so its collection was not changed automatically.'
        : data.alreadyImported
          ? 'Existing browse-only dress updated in its selected collection.'
          : 'Dress is now listed in its selected collection as Coming soon. It cannot be purchased yet.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this draft.');
    } finally {
      setBusy(false);
    }
  }

  async function importSelected() {
    const selected = results.filter((product) => selectedIds[product.id] && !importedIds[product.id]);
    const ready = selected.filter((product) => Boolean(storeCollectionFor(product)?.subcategory));
    const awaitingCollection = selected.filter((product) => !storeCollectionFor(product)?.subcategory);
    if (!adminPassword) {
      setError('Enter the Davinova admin password configured in Cloudflare first.');
      return;
    }
    if (selected.length === 0) {
      setError('Select at least one dress to add.');
      return;
    }
    if (ready.length === 0) {
      setError('Choose a category and sub-category for each selected product.');
      return;
    }

    setError('');
    setMessage('');
    setBusy(true);
    let saved = 0;
    const alreadyVerified: string[] = [];
    const failures: string[] = [];
    try {
      for (let index = 0; index < ready.length; index += 1) {
        const product = ready[index];
        const assignedCollection = collectionFor(product);
        const assignedStore = storeCollectionFor(product);
        if (!assignedStore?.subcategory) continue;
        setBatchProgress(`Adding ${index + 1} of ${ready.length}: ${product.name}`);
        try {
          const response = await fetch('/api/admin/cj-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
            body: JSON.stringify({
              productId: product.id,
              collectionCategory: assignedCollection,
              storeCollection: assignedStore.collection,
              storeSubcategory: assignedStore.subcategory,
            }),
            cache: 'no-store',
          });
          const data = await readJson(response);
          if (data.status === 'already_verified') alreadyVerified.push(product.name);
          else saved += 1;
          setImportedIds((current) => ({ ...current, [product.id]: data.productId || product.id }));
          setSelectedIds((current) => ({ ...current, [product.id]: false }));
        } catch (cause) {
          failures.push(`${product.name}: ${cause instanceof Error ? cause.message : 'Import failed.'}`);
        }
      }
      const summary = [`Finished: ${saved} dress(es) added or updated for browsing.`];
      if (awaitingCollection.length) summary.push(`${awaitingCollection.length} selected dress(es) were skipped until a collection is chosen.`);
      if (alreadyVerified.length) summary.push(`${alreadyVerified.length} already-verified item(s) were left unchanged.`);
      if (failures.length) summary.push(`${failures.length} failed: ${failures.join(' | ')}`);
      setMessage(summary.join(' '));
    } finally {
      setBatchProgress('');
      setBusy(false);
    }
  }

  const selectableResults = results.filter((product) => !importedIds[product.id]);
  const selectedCount = selectableResults.filter((product) => selectedIds[product.id]).length;
  const allSelectableSelected = selectableResults.length > 0 && selectableResults.every((product) => selectedIds[product.id]);

  return (
    <main style={{ minHeight: '100vh', background: '#f5f0eb', color: '#292522', padding: '32px 18px 60px', fontFamily: 'DM Sans, Arial, sans-serif' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <a href="/" style={{ color: '#6f625b', fontSize: 13, textDecoration: 'none' }}>← Davinova storefront</a>
        <p style={{ letterSpacing: '.18em', fontSize: 11, textTransform: 'uppercase', marginTop: 30 }}>Private sourcing workspace</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 500, margin: '8px 0' }}>CJ product catalogue</h1>
        <p style={{ color: '#746960', lineHeight: 1.6, maxWidth: 720 }}>Search CJ’s catalogue and inspect variant IDs, listed prices and stock before choosing products for Davinova.</p>

        <section style={{ background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 14, padding: 18, marginTop: 24 }}>
          <label htmlFor="adminPassword" style={{ display: 'block', fontSize: 13, marginBottom: 7 }}>Davinova admin password</label>
          <input id="adminPassword" type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Enter the Cloudflare ADMIN_PASSWORD secret" style={{ boxSizing: 'border-box', width: '100%', padding: '12px 13px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 15 }} />
          <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>The password stays in this page’s memory only and is sent to your own site over HTTPS. It is not saved in the browser.</p>
          <form onSubmit={search} style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <label htmlFor="keyword" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Search CJ</label>
            <input id="keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="e.g. wedding guest dress" style={{ flex: '1 1 260px', minWidth: 0, padding: '13px 14px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 15 }} />
            <button type="submit" disabled={busy} style={{ padding: '13px 20px', border: 0, borderRadius: 8, background: '#292522', color: '#fff', cursor: busy ? 'wait' : 'pointer', opacity: busy ? .65 : 1 }}>{busy ? 'Please wait…' : 'Search CJ'}</button>
          </form>
          <div style={{ marginTop: 16, color: '#746960', fontSize: 13, lineHeight: 1.6 }}>
            Each dress is assigned to its own collection. Davinova suggests a collection only when the CJ title or category gives a clear clue; ambiguous dresses must be categorized manually before they are added.
          </div>
          <div style={{ marginTop: 14, padding: 14, border: '1px solid #e4d8cf', borderRadius: 10, background: '#f7f1ec' }}>
            <strong style={{ display: 'block', fontSize: 14 }}>Already imported dresses</strong>
            <p style={{ color: '#746960', fontSize: 12, lineHeight: 1.6, margin: '6px 0 12px' }}>Sort existing imported CJ products into your Davinova clothing collections and subcategories using their titles, descriptions, and tags. Items without a clear match stay unchanged for manual review; supplier-verified products are protected.</p>
            <button type="button" onClick={organizeExistingDresses} disabled={busy || !adminPassword} style={{ padding: '11px 15px', border: 0, borderRadius: 8, background: '#292522', color: '#fff', cursor: busy || !adminPassword ? 'not-allowed' : 'pointer', opacity: busy || !adminPassword ? .6 : 1 }}>
              {busy ? 'Working…' : 'Organize existing imported products'}
            </button>
            {needsReviewProducts.length > 0 && <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #dfd3c8' }}>
              <strong style={{ display: 'block', fontSize: 14 }}>Needs a manual collection match ({needsReviewProducts.length})</strong>
              <p style={{ color: '#746960', fontSize: 12, lineHeight: 1.5 }}>These imported items did not have a clear title match. Choose the collection and subcategory you supplied; saving changes only the category metadata.</p>
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                {needsReviewProducts.map((product) => {
                  const selected = reviewAssignments[product.id];
                  const selectedGroup = selected?.collection ?? product.currentCollection ?? '';
                  const selectedSubcategory = selected?.subcategory ?? product.currentSubcategory ?? '';
                  const subcategories = findStoreCollectionGroup(selectedGroup)?.subcategories ?? [];
                  return <article key={product.id} style={{ padding: 12, border: '1px solid #e4d8cf', borderRadius: 9, background: '#fffdfb' }}>
                    <strong style={{ display: 'block', fontSize: 13, lineHeight: 1.5 }}>{product.title}</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 9, marginTop: 10 }}>
                      <label style={{ fontSize: 11 }}>
                        Collection
                        <select value={selectedGroup} onChange={(event) => setReviewAssignments((current) => ({
                          ...current,
                          [product.id]: { collection: event.target.value, subcategory: '' },
                        }))} style={{ display: 'block', width: '100%', marginTop: 5, padding: 9, border: '1px solid #d8cbc1', borderRadius: 7, background: '#fff' }}>
                          <option value="">Choose collection…</option>
                          {storeCollectionGroups.map((group) => <option key={group.slug} value={group.slug}>{group.label}</option>)}
                        </select>
                      </label>
                      <label style={{ fontSize: 11 }}>
                        Subcategory
                        <select value={selectedSubcategory} disabled={!selectedGroup} onChange={(event) => setReviewAssignments((current) => ({
                          ...current,
                          [product.id]: { collection: selectedGroup, subcategory: event.target.value },
                        }))} style={{ display: 'block', width: '100%', marginTop: 5, padding: 9, border: '1px solid #d8cbc1', borderRadius: 7, background: '#fff' }}>
                          <option value="">Choose subcategory…</option>
                          {subcategories.map((subcategory) => <option key={subcategory.slug} value={subcategory.slug}>{subcategory.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <button type="button" disabled={busy || !selectedGroup || !selectedSubcategory} onClick={() => saveReviewAssignment(product)} style={{ marginTop: 10, padding: '9px 12px', border: 0, borderRadius: 7, background: '#292522', color: '#fff', opacity: busy || !selectedGroup || !selectedSubcategory ? .6 : 1, cursor: busy || !selectedGroup || !selectedSubcategory ? 'not-allowed' : 'pointer' }}>Save category</button>
                  </article>;
                })}
              </div>
            </div>}
          </div>
        </section>

        <section style={{ background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 14, padding: 18, marginTop: 16 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 24, fontWeight: 500, margin: '0 0 8px' }}>Search several terms at once</h2>
          <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>CJ's search only matches one keyword at a time, so running several terms is the way to surface more of the catalogue in one pass. Results are merged and de-duplicated below, ready to select-all and batch import.</p>
          <form onSubmit={searchMultipleTerms}>
            <label htmlFor="multiKeywords" style={{ display: 'block', fontSize: 13, marginBottom: 7 }}>Search terms (comma or new-line separated, up to 15)</label>
            <textarea id="multiKeywords" value={multiKeywords} onChange={(event) => setMultiKeywords(event.target.value)} rows={3} style={{ boxSizing: 'border-box', width: '100%', padding: '12px 13px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
              <label htmlFor="pagesPerTerm" style={{ fontSize: 13 }}>Pages per term (10 results each)</label>
              <input id="pagesPerTerm" type="number" min={1} max={5} value={pagesPerTerm} onChange={(event) => setPagesPerTerm(Number(event.target.value))} style={{ width: 70, padding: '9px 10px', border: '1px solid #d8cbc1', borderRadius: 8, background: '#fff', fontSize: 14 }} />
              <button type="submit" disabled={busy} style={{ padding: '13px 20px', border: 0, borderRadius: 8, background: '#292522', color: '#fff', cursor: busy ? 'wait' : 'pointer', opacity: busy ? .65 : 1 }}>{busy && multiSearchProgress ? 'Searching…' : 'Search all terms'}</button>
            </div>
            {multiSearchProgress && <p role="status" style={{ color: '#746960', fontSize: 13, marginTop: 10 }}>{multiSearchProgress}</p>}
            <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>CJ allows roughly one request per second, so this takes about a second per page per term — searching 5 terms at 2 pages each takes about 10 seconds.</p>
          </form>
        </section>

        <section style={{ background: '#efe5dc', borderRadius: 12, padding: 16, marginTop: 16, fontSize: 13, lineHeight: 1.6 }}>
          <strong>Browse-only listing.</strong> Saving a dress adds it to the public Davinova catalogue as Coming soon. Its supplier verification and stock remain unconfirmed, no selling price is set, and purchase controls stay disabled. No supplier order is placed.
        </section>

        {error && <p role="alert" style={{ color: '#9b3125', background: '#fff4f1', border: '1px solid #efc6be', borderRadius: 8, padding: 12, marginTop: 16 }}>{error}</p>}
        {message && <p role="status" style={{ color: '#466543', background: '#f2f6ef', border: '1px solid #d5e4d0', borderRadius: 8, padding: 12, marginTop: 16 }}>{message}</p>}

        {results.length > 0 && <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 32, fontWeight: 500, margin: 0 }}>Search results</h2>
            <span style={{ color: '#746960', fontSize: 13 }}>{results.length.toLocaleString()} loaded · {total.toLocaleString()} matching CJ records reported</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16, padding: '12px 14px', background: '#efe5dc', borderRadius: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
              <input type="checkbox" checked={allSelectableSelected} disabled={busy || selectableResults.length === 0} onChange={(event) => {
                const checked = event.target.checked;
                setSelectedIds((current) => {
                  const next = { ...current };
                  selectableResults.forEach((product) => { next[product.id] = checked; });
                  return next;
                });
              }} />
              Select all available results ({selectableResults.length})
            </label>
            <button type="button" onClick={importSelected} disabled={busy || selectedCount === 0} style={{ padding: '12px 16px', border: 0, borderRadius: 8, background: '#292522', color: '#fff', cursor: busy || selectedCount === 0 ? 'not-allowed' : 'pointer', opacity: busy || selectedCount === 0 ? .55 : 1 }}>
              {busy && batchProgress ? 'Adding selected dresses…' : `Add ${selectedCount} selected dress${selectedCount === 1 ? '' : 'es'} (browse only)`}
            </button>
          </div>
          {batchProgress && <p role="status" style={{ color: '#746960', fontSize: 13, marginTop: 10 }}>{batchProgress}</p>}
          <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>Choose several dresses and add them in one batch. Each listing stays marked Coming soon until its selling details are verified.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, marginTop: 16 }}>
            {results.map((product) => {
              const detail = details[product.id];
              const selectedStoreAssignment = storeCollectionFor(product);
              const selectedStoreGroup = storeAssignments[product.id]?.collection ?? selectedStoreAssignment?.collection ?? '';
              const selectedStoreSubcategory = storeAssignments[product.id]?.subcategory ?? selectedStoreAssignment?.subcategory ?? '';
              const availableStoreSubcategories = findStoreCollectionGroup(selectedStoreGroup)?.subcategories ?? [];
              return <article key={product.id} style={{ background: '#fffdfb', border: '1px solid #e4d8cf', borderRadius: 12, overflow: 'hidden' }}>
                {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} style={{ display: 'block', width: '100%', height: 270, objectFit: 'contain', background: '#f0e7df' }} /> : <div style={{ height: 270, display: 'grid', placeItems: 'center', background: '#f0e7df', color: '#82756d' }}>No image preview from CJ</div>}
                <div style={{ padding: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: '#746960', marginBottom: 12, cursor: busy || Boolean(importedIds[product.id]) ? 'default' : 'pointer' }}>
                    <input type="checkbox" checked={Boolean(selectedIds[product.id])} disabled={busy || Boolean(importedIds[product.id])} onChange={(event) => setSelectedIds((current) => ({ ...current, [product.id]: event.target.checked }))} />
                    {importedIds[product.id] ? 'Already added to Davinova' : 'Select for batch import'}
                  </label>
                  <p style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 10, color: '#82756d' }}>{product.category || 'CJ catalogue'}</p>
                  <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, margin: '6px 0 10px' }}>{product.name}</h3>
                  <div style={{ marginTop: 12, padding: 11, background: '#f7f1ec', borderRadius: 8 }}>
                    <label htmlFor={`store-collection-${product.id}`} style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Clothing collection</label>
                    <select
                      id={`store-collection-${product.id}`}
                      value={selectedStoreGroup}
                      onChange={(event) => setStoreAssignments((current) => ({
                        ...current,
                        [product.id]: { collection: event.target.value, subcategory: '' },
                      }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #d8cbc1', borderRadius: 7, background: '#fff', fontSize: 13 }}
                    >
                      <option value="">Choose one of your collections…</option>
                      {storeCollectionGroups.map((group) => <option key={group.slug} value={group.slug}>{group.label}</option>)}
                    </select>
                    <label htmlFor={`store-subcategory-${product.id}`} style={{ display: 'block', fontSize: 12, fontWeight: 600, margin: '10px 0 6px' }}>Clothing subcategory</label>
                    <select
                      id={`store-subcategory-${product.id}`}
                      value={selectedStoreSubcategory}
                      disabled={!selectedStoreGroup}
                      onChange={(event) => setStoreAssignments((current) => ({
                        ...current,
                        [product.id]: { collection: selectedStoreGroup, subcategory: event.target.value },
                      }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #d8cbc1', borderRadius: 7, background: '#fff', fontSize: 13 }}
                    >
                      <option value="">Choose a subcategory…</option>
                      {availableStoreSubcategories.map((subcategory) => <option key={subcategory.slug} value={subcategory.slug}>{subcategory.label}</option>)}
                    </select>
                    <p style={{ fontSize: 11, lineHeight: 1.5, color: '#746960', margin: '6px 0 0' }}>
                      {storeAssignments[product.id] ? 'Manual clothing category selected.' : selectedStoreAssignment?.subcategoryLabel ? `Suggested: ${selectedStoreAssignment.collectionLabel} → ${selectedStoreAssignment.subcategoryLabel}.` : 'Choose the best clothing category and subcategory for this product.'}
                    </p>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>CJ product ID: <code>{product.id}</code></p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>SKU: <code>{product.sku || 'Not supplied'}</code></p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>Listed item price: <strong>{money(product.discountPriceUsd ?? product.sellPriceUsd)}</strong></p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>Reported inventory: <strong>{product.inventoryTotal === null ? 'Not supplied' : product.inventoryTotal.toLocaleString()}</strong>; verified: {product.verifiedInventory === null ? 'not supplied' : product.verifiedInventory.toLocaleString()}</p>
                  <p style={{ margin: '5px 0', fontSize: 13 }}>Free-shipping flag: {product.freeShippingFlag === null ? 'not supplied' : product.freeShippingFlag ? 'Yes' : 'No'}</p>
                  <button type="button" onClick={() => loadDetails(product)} disabled={busy} style={{ marginTop: 12, padding: '10px 13px', border: '1px solid #bca99b', background: '#fff', borderRadius: 8, color: '#292522', cursor: busy ? 'wait' : 'pointer' }}>{detail ? 'Refresh variants' : 'Inspect sizes & variants'}</button>
                  {detail && <div style={{ marginTop: 16, borderTop: '1px solid #e4d8cf', paddingTop: 14 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Variants ({detail.variants.length})</h4>
                    {detail.variants.length === 0 ? <p style={{ fontSize: 13 }}>CJ did not return variants for this product.</p> : <div style={{ display: 'grid', gap: 10 }}>
                      {detail.variants.map((variant) => <div key={variant.id || variant.sku} style={{ background: '#f7f1ec', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{variant.options || variant.name || 'Variant'}</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>VID: <code>{variant.id || 'not supplied'}</code></div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>SKU: <code>{variant.sku || 'not supplied'}</code> · {money(variant.sellPriceUsd)}</div>
                        {variant.inventory.length > 0 ? variant.inventory.map((stock, index) => <div key={stock.countryCode + index} style={{ color: '#746960', fontSize: 12, marginTop: 5 }}>{stock.countryCode || 'Warehouse'}: {stock.total ?? '—'} total · CJ {stock.cjStock ?? '—'} · factory {stock.factoryStock ?? '—'} · {stock.verifiedWarehouse ? 'verified' : 'not verified'}</div>) : <div style={{ color: '#746960', fontSize: 12, marginTop: 5 }}>No inventory records supplied.</div>}
                      </div>)}
                    </div>}
                    <p style={{ color: '#82756d', fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>Before any draft can be published, we still need to verify stock, real-world size mapping, shipping to France, total landed cost, and commercial image rights.</p>
                    <button type="button" onClick={() => saveDraft(product)} disabled={busy || !selectedStoreSubcategory} style={{ marginTop: 8, padding: '12px 14px', border: 0, borderRadius: 8, background: importedIds[product.id] ? '#e2e8de' : '#292522', color: importedIds[product.id] ? '#466543' : '#fff', cursor: busy || !selectedStoreSubcategory ? 'not-allowed' : 'pointer', opacity: busy || !selectedStoreSubcategory ? .65 : 1 }}>
                      {importedIds[product.id] ? 'Update collection' : busy ? 'Adding to website…' : 'Add to website (browse only)'}
                    </button>
                    {importedIds[product.id] && <p role="status" style={{ fontSize: 12, color: '#466543', marginTop: 8 }}>Saved in Davinova as {importedIds[product.id]}. Visible to browse, but unavailable to purchase.</p>}
                  </div>}
                </div>
              </article>;
            })}
          </div>
          {hasMore && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}><button type="button" onClick={loadMoreResults} disabled={busy} style={{ padding: '12px 18px', border: '1px solid #bca99b', background: '#fffdfb', borderRadius: 8, color: '#292522', cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Loading…' : `Load 10 more dresses · ${Math.max(0, total - results.length)} remaining`}</button></div>}
        </div>}
        {results.length === 0 && !busy && !error && <p style={{ color: '#82756d', marginTop: 26, fontSize: 14 }}>Search for dresses when you’re ready. Results will appear here for review before anything is imported.</p>}
        <footer style={{ marginTop: 38, color: '#93867c', fontSize: 12 }}>Davinova · Private sourcing workspace · No supplier purchases can be made here.</footer>
      </div>
    </main>
  );
}
