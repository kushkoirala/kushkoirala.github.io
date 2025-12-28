import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, FileText, Filter, Link as LinkIcon, Loader2, Search, Upload, BarChart3, Minimize2, Maximize2, ClipboardCheck, CheckCircle2, Clock, AlertCircle, MinusCircle } from 'lucide-react';

// Fully static ReqIF viewer: loads pre-converted JSON from /public/reqif-cache.json
// (produced by scripts/convert-reqif.js during build).

// Type colors for visual distinction
const TYPE_COLORS = {
  'TYPE_Heading': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' },
  'TYPE_Requirement': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
  'TYPE_Subpart': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
  'TYPE_Category': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', badge: 'bg-teal-100 text-teal-700' },
  'Heading': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' },
  'Subpart': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
  'Category': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', badge: 'bg-teal-100 text-teal-700' },
  'Requirement': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
  'Architecture': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', badge: 'bg-green-100 text-green-700' },
  'default': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', badge: 'bg-gray-100 text-gray-700' }
};

const getTypeColor = (type) => {
  if (!type) return TYPE_COLORS.default;
  // Check for architecture items by ID prefix
  if (type.includes('ARCH') || type.includes('Architecture')) return TYPE_COLORS.Architecture;
  return TYPE_COLORS[type] || TYPE_COLORS.default;
};

const getTypeLabel = (type, id) => {
  if (!type) return 'Unknown';
  if (id?.startsWith('ARCH') || id?.includes('ARCH')) return 'Architecture';
  if (type.includes('Heading')) return 'Heading';
  if (type.includes('Subpart')) return 'Subpart';
  if (type.includes('Category')) return 'Category';
  if (type.includes('Requirement')) return 'Requirement';
  return type.replace('TYPE_', '');
};

// V&V Status colors and icons
const COMPLIANCE_STATUS = {
  'Not Started': { bg: 'bg-gray-100', text: 'text-gray-600', icon: MinusCircle },
  'In Progress': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  'Compliant': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  'Non-Compliant': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  'Not Applicable': { bg: 'bg-gray-100', text: 'text-gray-500', icon: MinusCircle },
};

const VERIFICATION_METHOD = {
  'Analysis': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Test': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Inspection': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Demonstration': { bg: 'bg-teal-100', text: 'text-teal-700' },
  'Analysis/Test': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

const ReqIFViewer = ({ reqifFile = 'part25-certification.reqif' }) => {
  const [cache, setCache] = useState(null);
  const [selectedFile, setSelectedFile] = useState(reqifFile);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [_uploadedData, setUploadedData] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [showStats, setShowStats] = useState(false);

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

  // Only set initial file when cache first loads, not on every selectedFile change
  useEffect(() => {
    if (!cache?.files?.length) return;
    // Only set initial file if current selection is invalid
    if (!cache.files.includes(selectedFile)) {
      if (cache.files.includes(reqifFile)) {
        setSelectedFile(reqifFile);
      } else {
        setSelectedFile(cache.files[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, reqifFile]);

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

  // Get unique sources for filter dropdown
  const uniqueSources = useMemo(() => {
    const sources = new Set();
    requirements.forEach((r) => {
      const source = r.attributes?.attr_source?.trim();
      if (source) sources.add(source);
    });
    return Array.from(sources).sort();
  }, [requirements]);

  // Get unique types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = new Set();
    requirements.forEach((r) => {
      const typeLabel = getTypeLabel(r.type, r.id);
      types.add(typeLabel);
    });
    return Array.from(types).sort();
  }, [requirements]);

  // Statistics computation
  const stats = useMemo(() => {
    const byType = {};
    const bySource = {};
    const byVerificationMethod = {};
    const byComplianceStatus = {};

    requirements.forEach((r) => {
      const typeLabel = getTypeLabel(r.type, r.id);
      byType[typeLabel] = (byType[typeLabel] || 0) + 1;

      const source = r.attributes?.attr_source?.trim() || 'Unknown';
      bySource[source] = (bySource[source] || 0) + 1;

      // V&V stats
      const vMethod = r.attributes?.attr_verificationmethod;
      if (vMethod) {
        byVerificationMethod[vMethod] = (byVerificationMethod[vMethod] || 0) + 1;
      }
      const cStatus = r.attributes?.attr_compliancestatus;
      if (cStatus) {
        byComplianceStatus[cStatus] = (byComplianceStatus[cStatus] || 0) + 1;
      }
    });

    return {
      total: requirements.length,
      byType,
      bySource,
      byVerificationMethod,
      byComplianceStatus,
      withTraceability: relations.length
    };
  }, [requirements, relations]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return requirements.filter((r) => {
      // Search filter
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
      const matchesSearch = id.includes(term) || text.includes(term);

      // Type filter
      const typeLabel = getTypeLabel(r.type, r.id);
      const matchesType = filterType === 'all' || typeLabel === filterType;

      // Source filter
      const source = r.attributes?.attr_source?.trim() || 'Unknown';
      const matchesSource = filterSource === 'all' || source === filterSource;

      return matchesSearch && matchesType && matchesSource;
    });
  }, [requirements, search, filterType, filterSource]);

  const trace = useMemo(() => {
    if (!selected) return null;
    const nodes = [];
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

  // Create a map for quick requirement lookup by ID (for clickable traceability)
  const requirementMap = useMemo(() => {
    const map = new Map();
    requirements.forEach((r) => map.set(r.id, r));
    return map;
  }, [requirements]);

  // Navigate to a requirement by ID
  const navigateToRequirement = useCallback((id) => {
    const req = requirementMap.get(id);
    if (req) {
      setSelected(req);
      // Expand parent nodes to make it visible
      // For simplicity, expand all nodes that might contain this requirement
      const newExpanded = new Set(expanded);
      specTrees.forEach((spec) => {
        newExpanded.add(spec.id);
        const findAndExpand = (nodes, path = []) => {
          for (const node of nodes) {
            if (node.req.id === id) {
              path.forEach((p) => newExpanded.add(p));
              return true;
            }
            if (node.children?.length) {
              if (findAndExpand(node.children, [...path, node.req.id])) return true;
            }
          }
          return false;
        };
        findAndExpand(spec.children);
      });
      setExpanded(newExpanded);
    }
  }, [requirementMap, expanded, specTrees]);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allIds = new Set();
    specTrees.forEach((spec) => {
      allIds.add(spec.id);
      const collectIds = (nodes) => {
        nodes.forEach((node) => {
          allIds.add(node.req.id);
          if (node.children?.length) collectIds(node.children);
        });
      };
      collectIds(spec.children);
    });
    setExpanded(allIds);
  }, [specTrees]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

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
        const typeLabel = getTypeLabel(req.type, req.id);
        const typeColor = getTypeColor(req.type);
        const isArchitecture = req.id?.startsWith('ARCH');
        const effectiveColor = isArchitecture ? TYPE_COLORS.Architecture : typeColor;

        return (
          <li key={req.id} className={`border rounded-md p-3 bg-white ${effectiveColor.border} border-l-4`}>
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
                className={`flex-1 min-w-0 cursor-pointer ${selected?.id === req.id ? 'ring-2 ring-blue-500 rounded px-2 -mx-2' : ''}`}
                onClick={() => setSelected(req)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 break-words">{label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${effectiveColor.badge}`}>
                    {isArchitecture ? 'Architecture' : typeLabel}
                  </span>
                </div>
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
        const typeLabel = getTypeLabel(req.type, req.id);
        const isArchitecture = req.id?.startsWith('ARCH');
        const effectiveColor = isArchitecture ? TYPE_COLORS.Architecture : getTypeColor(req.type);

        return (
          <li
            key={req.id}
            onClick={() => setSelected(req)}
            className={`border rounded-md p-3 cursor-pointer transition border-l-4 ${effectiveColor.border} ${selected?.id === req.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 break-words">{label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${effectiveColor.badge}`}>
                    {isArchitecture ? 'Architecture' : typeLabel}
                  </span>
                </div>
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
    <div className="w-full h-full bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col">
      {/* Header Row 1: File selection and search */}
      <div className="border-b bg-gray-50 px-4 py-3 flex flex-wrap items-center gap-4 flex-shrink-0">
        <div>
          <div className="text-sm font-semibold text-gray-900">Requirements (ReqIF)</div>
          <div className="text-xs text-gray-500">Browse and analyze requirements</div>
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
          Upload
          <input
            type="file"
            accept=".reqif,.xml"
            onChange={handleReqIfUpload}
            className="hidden"
          />
        </label>
        <div className="relative w-48 ml-auto">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Header Row 2: Filters, expand/collapse, and stats toggle */}
      <div className="border-b bg-gray-100 px-4 py-2 flex flex-wrap items-center gap-3 flex-shrink-0">
        {/* Type Filter */}
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-gray-500" />
          <select
            className="text-xs border rounded px-2 py-1 bg-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <select
          className="text-xs border rounded px-2 py-1 bg-white"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
        >
          <option value="all">All Sources</option>
          {uniqueSources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Expand/Collapse buttons */}
        <div className="flex items-center gap-1 border-l pl-3 ml-1">
          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200"
            title="Expand all"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expand</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200"
            title="Collapse all"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Collapse</span>
          </button>
        </div>

        {/* Stats toggle */}
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded ml-auto ${showStats ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
          title="Toggle statistics"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Stats</span>
        </button>

        {/* Results count */}
        <span className="text-xs text-gray-500">
          {filtered.length} of {requirements.length}
        </span>
      </div>

      {/* Statistics Panel (collapsible) */}
      {showStats && (
        <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total Items</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{stats.byType['Requirement'] || 0}</div>
              <div className="text-xs text-gray-500">Requirements</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.byComplianceStatus['Compliant'] || 0}</div>
              <div className="text-xs text-gray-500">Compliant</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-yellow-600">{stats.byComplianceStatus['In Progress'] || 0}</div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
          </div>
          {/* V&V Breakdown */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Verification Methods */}
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs font-semibold text-gray-600 mb-1.5">Verification Methods</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.byVerificationMethod).map(([method, count]) => (
                  <span
                    key={method}
                    className={`text-xs px-2 py-0.5 rounded-full ${VERIFICATION_METHOD[method]?.bg || 'bg-gray-100'} ${VERIFICATION_METHOD[method]?.text || 'text-gray-700'}`}
                  >
                    {method}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
            {/* Compliance Status */}
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-xs font-semibold text-gray-600 mb-1.5">Compliance Status</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.byComplianceStatus).map(([status, count]) => (
                  <span
                    key={status}
                    className={`text-xs px-2 py-0.5 rounded-full ${COMPLIANCE_STATUS[status]?.bg || 'bg-gray-100'} ${COMPLIANCE_STATUS[status]?.text || 'text-gray-700'}`}
                  >
                    {status}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {Object.entries(stats.bySource).map(([source, count]) => (
              <span
                key={source}
                className="text-xs bg-white px-2 py-1 rounded-full shadow-sm cursor-pointer hover:bg-gray-50"
                onClick={() => setFilterSource(source)}
              >
                {source}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] divide-y lg:divide-y-0 lg:divide-x overflow-hidden">
        <div className="h-full overflow-y-auto p-3 bg-gray-50">
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

        <div className="h-full overflow-y-auto bg-gray-50">
          {selected ? (
            <div className="p-4 space-y-4">
              {/* Header with type badge */}
              <div>
                <div className="text-lg font-semibold text-gray-900">{selected.attributes?.long_name || selected.attributes?.attr_title || selected.id}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${(selected.id?.startsWith('ARCH') ? TYPE_COLORS.Architecture : getTypeColor(selected.type)).badge}`}>
                    {getTypeLabel(selected.type, selected.id)}
                  </span>
                  {selected.attributes?.attr_id && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {selected.attributes.attr_id}
                    </span>
                  )}
                  {selected.attributes?.attr_source && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      {selected.attributes.attr_source}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-sm font-semibold text-gray-800 mb-1">Description</div>
                <div className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-md border">
                  {selected.attributes?.description || selected.attributes?.attr_text || selected.attributes?.long_name || selected.attributes?.value || 'No description available.'}
                </div>
              </div>

              {/* V&V Parameters - only show for requirements */}
              {selected.attributes?.attr_verificationmethod && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600" /> V&V Parameters
                  </div>
                  <div className="bg-white border rounded-md p-3 space-y-3">
                    {/* Verification Method & Compliance Status Row */}
                    <div className="flex flex-wrap gap-3">
                      {/* Verification Method */}
                      <div className="flex-1 min-w-[140px]">
                        <div className="text-xs text-gray-500 mb-1">Verification Method</div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${VERIFICATION_METHOD[selected.attributes.attr_verificationmethod]?.bg || 'bg-gray-100'} ${VERIFICATION_METHOD[selected.attributes.attr_verificationmethod]?.text || 'text-gray-700'}`}>
                          {selected.attributes.attr_verificationmethod}
                        </span>
                      </div>
                      {/* Compliance Status */}
                      <div className="flex-1 min-w-[140px]">
                        <div className="text-xs text-gray-500 mb-1">Compliance Status</div>
                        {(() => {
                          const status = selected.attributes.attr_compliancestatus || 'Not Started';
                          const statusConfig = COMPLIANCE_STATUS[status] || COMPLIANCE_STATUS['Not Started'];
                          const StatusIcon = statusConfig.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Evidence/Artifact */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Evidence / Artifact</div>
                      <div className="text-sm text-gray-700">
                        {selected.attributes.attr_evidence || <span className="text-gray-400 italic">Not specified</span>}
                      </div>
                    </div>

                    {/* Responsible Party & Target Date Row */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex-1 min-w-[140px]">
                        <div className="text-xs text-gray-500 mb-1">Responsible Party</div>
                        <div className="text-sm text-gray-700">
                          {selected.attributes.attr_responsibleparty || <span className="text-gray-400 italic">Not assigned</span>}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[140px]">
                        <div className="text-xs text-gray-500 mb-1">Target Date</div>
                        <div className="text-sm text-gray-700">
                          {selected.attributes.attr_targetdate || <span className="text-gray-400 italic">Not set</span>}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {selected.attributes.attr_notes && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Notes</div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {selected.attributes.attr_notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attributes */}
              {selected.attributes && (
                <div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">Attributes</div>
                  <div className="bg-white border rounded-md p-3 space-y-1 text-sm text-gray-700">
                    {Object.entries(selected.attributes).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="font-semibold text-gray-800 min-w-[120px] capitalize">{k.replace('attr_', '').replace('_', ' ')}:</span>
                        <span className="text-gray-700 break-words">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Traceability - now with clickable links */}
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1">
                  <LinkIcon className="h-4 w-4 text-blue-600" /> Traceability
                </div>
                <div className="bg-white border rounded-md p-3 space-y-2 text-sm">
                  {(!trace || trace.nodes.length === 0) ? (
                    <div className="text-gray-500 text-center py-2">No linked requirements found.</div>
                  ) : (
                    trace.nodes.map((node) => {
                      const linkedReq = requirementMap.get(node.id);
                      const linkedLabel = linkedReq?.attributes?.long_name || linkedReq?.attributes?.attr_title || node.label;
                      return (
                        <div
                          key={node.id}
                          className="flex justify-between items-center p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition"
                          onClick={() => navigateToRequirement(node.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-800 font-medium truncate">{linkedLabel}</div>
                            <div className="text-xs text-gray-500">{node.id}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${node.type === 'traces_to' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {node.type === 'traces_to' ? 'Traces To' : 'Traced From'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="h-10 w-10 opacity-40 mx-auto mb-2" />
                <div className="text-sm">Select a requirement to view details</div>
                <div className="text-xs text-gray-400 mt-1">Click on any item in the tree</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReqIFViewer;
