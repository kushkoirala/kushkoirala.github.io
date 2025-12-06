import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Link as LinkIcon, Loader2, Search, Upload } from 'lucide-react';

// Fully static ReqIF viewer: loads pre-converted JSON from /public/reqif-cache.json
// (produced by scripts/convert-reqif.js during build).

const ReqIFViewer = ({ reqifFile = 'udaan.reqif' }) => {
  const [cache, setCache] = useState(null);
  const [selectedFile, setSelectedFile] = useState(reqifFile);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [_uploadedData, setUploadedData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/reqif-cache.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Failed to load reqif-cache.json (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setCache(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cache?.files?.length) return;
    if (cache.files.includes(reqifFile)) {
      setSelectedFile(reqifFile);
    } else if (!cache.files.includes(selectedFile)) {
      setSelectedFile(cache.files[0]);
    }
  }, [cache, reqifFile, selectedFile]);

  const dataset = useMemo(() => {
    if (!cache?.byFile) return null;
    const fromSelected = cache.byFile[selectedFile];
    if (fromSelected) return fromSelected;
    const first = cache.files?.[0];
    return first ? cache.byFile[first] : null;
  }, [cache, selectedFile]);

  const requirements = useMemo(() => dataset?.requirements || [], [dataset]);
  const relations = useMemo(() => dataset?.relations || [], [dataset]);
  const specTrees = useMemo(() => {
    if (!dataset?.specifications) return [];
    const map = new Map();
    requirements.forEach((r) => {
      map.set(r.id, r);
    });

    const build = (node) => {
      const req = map.get(node.id) || { id: node.id, attributes: {}, type: 'Requirement' };
      return {
        req,
        children: (node.children || []).map(build),
      };
    };

    return dataset.specifications.map((spec) => ({
      id: spec.id,
      title: spec.title || spec.id,
      children: (spec.children || []).map(build),
    }));
  }, [dataset, requirements]);

  useEffect(() => {
    // Auto-expand the single spec root for easier navigation
    if (specTrees.length === 1) {
      setExpanded(new Set([specTrees[0].id]));
    }
  }, [specTrees]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return requirements.filter((r) => {
      const id = (r.id || '').toLowerCase();
      const text = (
        r.attributes?.long_name ||
        r.attributes?.attr_title ||
        r.attributes?.description ||
        r.attributes?.attr_text ||
        r.attributes?.attr_id ||
        r.attributes?.attr_source ||
        r.attributes?.value ||
        ''
      ).toLowerCase();
      return id.includes(term) || text.includes(term);
    });
  }, [requirements, search]);

  const trace = useMemo(() => {
    if (!selected) return null;
    const nodes = [{ id: selected.id, label: selected.id, type: 'requirement' }];
    const edges = [];
    relations.forEach((rel) => {
      const { source, target, type } = rel;
      if (source === selected.id && target) {
        nodes.push({ id: target, label: target, type: 'traces_to' });
        edges.push({ source, target, type });
      }
      if (target === selected.id && source) {
        nodes.push({ id: source, label: source, type: 'traced_from' });
        edges.push({ source, target, type });
      }
    });
    return { nodes, edges };
  }, [selected, relations]);

  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const handleReqIfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { parseStringPromise } = await import('xml2js');
      const data = await parseStringPromise(text, { explicitArray: false, preserveChildrenOrder: true });
      setUploadedData(data);
      setError(null);
    } catch (err) {
      setError(`Failed to parse ReqIF file: ${err.message}`);
    }
  };  useEffect(() => {
    setSelected(null);
    setExpanded(new Set());
    setSearch('');
  }, [selectedFile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white border rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-3 text-sm text-gray-600">Loading requirements…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        <div className="font-semibold mb-1">ReqIF viewer error</div>
        <div>{error}</div>
        <div className="text-xs text-red-600 mt-2">Ensure reqif-cache.json is produced during build.</div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
        No ReqIF data available. Add .reqif files to public/reqif/ and run the build.
      </div>
    );
  }

  const renderTree = (nodes) => (
    <ul className="space-y-2">
      {nodes.map((node) => {
        const { req, children } = node;
        const hasChildren = children && children.length > 0;
        const isExpanded = expanded.has(req.id);
        const label = req.attributes?.long_name || req.attributes?.attr_title || req.id;
        const sub = req.attributes?.description || req.attributes?.attr_text || req.attributes?.attr_id || req.attributes?.value;
        return (
          <li key={req.id} className="border rounded-md p-3 bg-white">
            <div className="flex items-start gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  className="mt-1 text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(req.id);
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <div className="mt-1 h-4 w-4" />
              )}
              <div
                className={`flex-1 min-w-0 cursor-pointer ${selected?.id === req.id ? 'border-l-2 border-blue-500 pl-2' : ''}`}
                onClick={() => setSelected(req)}
              >
                <div className="text-sm font-semibold text-gray-900 break-words">{label}</div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {sub || 'No description'}
                </div>
              </div>
            </div>
            {hasChildren && isExpanded && (
              <div className="mt-2 ml-4 border-l border-gray-200 pl-3">
                {renderTree(children)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const renderList = (items) => (
    <ul className="p-3 space-y-2">
      {items.map((req) => {
        const isExpanded = expanded.has(req.id);
        const label = req.attributes?.long_name || req.attributes?.attr_title || req.id;
        const sub = req.attributes?.description || req.attributes?.attr_text || req.attributes?.attr_id || req.attributes?.value;
        return (
          <li
            key={req.id}
            onClick={() => setSelected(req)}
            className={`border rounded-md p-3 cursor-pointer transition ${selected?.id === req.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-1 text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(req.id);
                }}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 break-words">{label}</div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {sub || 'No description'}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="w-full bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="border-b bg-gray-50 px-4 py-3 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">Requirements (ReqIF)</div>
          <div className="text-xs text-gray-500">Choose a ReqIF file and search within it.</div>
        </div>
        <select
          className="text-sm border rounded-md px-2 py-1 bg-white"
          value={selectedFile || ''}
          onChange={(e) => setSelectedFile(e.target.value)}
          disabled={!cache?.files?.length}
        >
          {cache?.files?.length ? (
            cache.files.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))
          ) : (
            <option value="">No ReqIF files found</option>
          )}
        </select>
        <label className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 cursor-pointer">
          <Upload className="h-4 w-4" />
          Upload ReqIF
          <input
            type="file"
            accept=".reqif,.xml"
            onChange={handleReqIfUpload}
            className="hidden"
          />
        </label>
        <div className="relative w-56 ml-auto">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search requirements"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] divide-y lg:divide-y-0 lg:divide-x">
        <div className="max-h-[520px] overflow-y-auto p-3 bg-gray-50">
          {search ? (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-gray-500">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-sm">No requirements match the search.</span>
              </div>
            ) : (
              renderList(filtered)
            )
          ) : specTrees.length > 0 ? (
            <div className="space-y-4">
              {specTrees.map((spec) => (
                <div key={spec.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-gray-500 hover:text-gray-800"
                      onClick={() => toggle(spec.id)}
                    >
                      {expanded.has(spec.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="text-sm font-semibold text-gray-800">{spec.title || spec.id}</div>
                  </div>
                  {expanded.has(spec.id) && renderTree(spec.children)}
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-gray-500">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">No requirements available.</span>
            </div>
          ) : (
            renderList(filtered)
          )}
        </div>

        <div className="max-h-[520px] overflow-y-auto bg-gray-50">
          {selected ? (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">{selected.attributes?.long_name || selected.attributes?.attr_title || selected.id}</div>
                <div className="text-xs text-blue-700 mt-1 px-2 py-1 inline-flex bg-blue-100 rounded-full">
                  {selected.type || selected.attributes?.type || 'Requirement'}
                </div>
                {selected.attributes?.attr_id && (
                  <div className="text-xs text-gray-600 mt-1">ID: {selected.attributes.attr_id}</div>
                )}
                {selected.attributes?.attr_source && (
                  <div className="text-xs text-gray-600">Source: {selected.attributes.attr_source}</div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800 mb-1">Description</div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {selected.attributes?.description || selected.attributes?.attr_text || selected.attributes?.long_name || selected.attributes?.value || 'No description available.'}
                </div>
              </div>
              {selected.attributes && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">Attributes</div>
                  <div className="bg-white border rounded-md p-3 space-y-1 text-sm text-gray-700">
                    {Object.entries(selected.attributes).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="font-semibold text-gray-800 min-w-[120px] capitalize">{k}:</span>
                        <span className="text-gray-700 break-words">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {trace && trace.nodes && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
                    <LinkIcon className="h-4 w-4 text-blue-600" /> Traceability
                  </div>
                  <div className="bg-white border rounded-md p-3 space-y-1 text-sm">
                    {trace.nodes.length === 0 && <div className="text-gray-500">No linked requirements.</div>}
                    {trace.nodes.map((node) => (
                      <div key={node.id} className="flex justify-between items-center">
                        <span className="text-gray-800">{node.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${node.type === 'traces_to' ? 'bg-blue-100 text-blue-700' : node.type === 'traced_from' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {node.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="h-10 w-10 opacity-40 mx-auto mb-2" />
                <div className="text-sm">Select a requirement to view details</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReqIFViewer;
