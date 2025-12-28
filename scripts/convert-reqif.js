#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reqifDir = path.join(projectRoot, 'public', 'reqif');
const outFile = path.join(projectRoot, 'public', 'reqif-cache.json');

const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const norm = (s) => (typeof s === 'string' ? s.trim() : s);

function extractText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if ('#text' in value) return norm(value['#text']);
    if ('_' in value) return norm(value._);
  }
  return '';
}

// Recursively extract all text content from XHTML structure
function extractXhtmlText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node.trim();
  if (Array.isArray(node)) {
    return node.map(extractXhtmlText).filter(Boolean).join(' ');
  }
  if (typeof node === 'object') {
    // Check for direct text content
    if ('_' in node) return norm(node._);
    if ('#text' in node) return norm(node['#text']);

    // Collect text from all child elements (div, p, strong, etc.)
    const parts = [];
    for (const [key, val] of Object.entries(node)) {
      if (key === '$') continue; // skip attributes
      const text = extractXhtmlText(val);
      if (text) parts.push(text);
    }
    return parts.join(' ');
  }
  return '';
}

function parseSpecObjects(specObjects) {
  const arr = asArray(specObjects);
  const out = [];
  arr.forEach((obj) => {
    const id = obj.$?.IDENTIFIER || obj.$?.Identifier || obj.$?.id || '';
    const typeRef = obj.TYPE?.['SPEC-OBJECT-TYPE-REF'] || obj.TYPE?.['SPEC-OBJECT-TYPE'] || '';
    const type = typeRef || obj.$?.TYPE || obj.$?.Type || 'Requirement';
    const attributes = {};

    const longName = obj['LONG-NAME'] ?? obj['LongName'] ?? obj['long-name'];
    if (longName) attributes.long_name = extractText(longName);

    // Values
    const values = obj.VALUES;
    if (values) {
      const attrVals = [
        ...asArray(values['ATTRIBUTE-VALUE-STRING']),
        ...asArray(values['ATTRIBUTE-VALUE-XHTML']),
        ...asArray(values['ATTRIBUTE-VALUE-INTEGER']),
      ];
      attrVals.forEach((val) => {
        const rawVal = val.$?.['THE-VALUE'] ?? val['THE-VALUE'];
        let text = Array.isArray(rawVal) ? extractText(rawVal[0]) : extractText(rawVal);

        // Try to extract XHTML content from nested structures (div, p, etc.)
        if (!text && rawVal && typeof rawVal === 'object') {
          text = extractXhtmlText(rawVal);
        }

        if (text) {
          const def = val.DEFINITION;
          const defKey =
            (def && typeof def === 'object' && (def['ATTRIBUTE-DEFINITION-STRING-REF'] || def['ATTRIBUTE-DEFINITION-XHTML-REF'] || def['ATTRIBUTE-DEFINITION-INTEGER-REF'])) ||
            (typeof def === 'string' ? def : null);
          const key =
            defKey ||
            val.$?.['THE-VALUE'] ||
            val.$?.['IDENTIFIER'] ||
            Object.keys(val).find((k) => k.startsWith('ATTRIBUTE-VALUE-')) ||
            'value';
          const normalizedKey = String(key).toLowerCase();
          attributes[normalizedKey] = text;
          if (!attributes.long_name && normalizedKey.includes('title')) attributes.long_name = text;
          if (!attributes.description && normalizedKey.includes('text')) attributes.description = text;
        }
      });

      // Parse enumeration attributes (V&V parameters)
      const enumVals = asArray(values['ATTRIBUTE-VALUE-ENUMERATION']);
      enumVals.forEach((val) => {
        const def = val.DEFINITION;
        const defKey =
          (def && typeof def === 'object' && def['ATTRIBUTE-DEFINITION-ENUMERATION-REF']) ||
          (typeof def === 'string' ? def : null);

        // Get the enum value reference
        const enumValRef = val.VALUES?.['ENUM-VALUE-REF'];
        const enumValue = extractText(enumValRef);

        if (defKey && enumValue) {
          const normalizedKey = String(defKey).toLowerCase();
          // Map enum value IDs to human-readable values
          const enumMap = {
            'vm_analysis': 'Analysis',
            'vm_test': 'Test',
            'vm_inspection': 'Inspection',
            'vm_demonstration': 'Demonstration',
            'vm_analysistest': 'Analysis/Test',
            'cs_notstarted': 'Not Started',
            'cs_inprogress': 'In Progress',
            'cs_compliant': 'Compliant',
            'cs_noncompliant': 'Non-Compliant',
            'cs_notapplicable': 'Not Applicable',
          };
          const readableValue = enumMap[enumValue.toLowerCase()] || enumValue;
          attributes[normalizedKey] = readableValue;
        }
      });
    }

    out.push({ id, type, attributes });
  });
  return out;
}

function parseRelations(specRelations) {
  const arr = asArray(specRelations);
  const out = [];
  arr.forEach((rel) => {
    const source = extractText(asArray(rel.SOURCE)[0]);
    const target = extractText(asArray(rel.TARGET)[0]);
    const type = rel.$?.TYPE || rel.$?.Type || 'traces';
    if (source || target) out.push({ source, target, type });
  });
  return out;
}

function parseSpecifications(specs) {
  const arr = asArray(specs);
  const out = [];
  const getObjRef = (h) => {
    // Common variants: OBJECT-REF, SPEC-OBJECT-REF, or nested OBJECT.SPEC-OBJECT-REF
    const direct = extractText(asArray(h['OBJECT-REF'])[0]);
    if (direct) return direct;
    const specRef = extractText(asArray(h['SPEC-OBJECT-REF'])[0]);
    if (specRef) return specRef;
    const nested = h.OBJECT;
    if (nested) {
      const nestedRef = extractText(asArray(nested['SPEC-OBJECT-REF'] || nested['OBJECT-REF'])[0]);
      if (nestedRef) return nestedRef;
    }
    return '';
  };

  const walkChildren = (node) => {
    const children = [];
    const hier = asArray(node['SPEC-HIERARCHY'] || node.CHILDREN?.['SPEC-HIERARCHY']);
    hier.forEach((h) => {
      const objRef = getObjRef(h) || h.$?.IDENTIFIER || '';
      const title = extractText(h['LONG-NAME']) || h.$?.['LONG-NAME'] || '';
      children.push({ id: objRef, title, children: walkChildren(h) });
    });
    return children;
  };

  arr.forEach((spec) => {
    const id = spec.$?.IDENTIFIER || spec.$?.Identifier || '';
    const title = extractText(asArray(spec['LONG-NAME'])[0]) || spec.$?.['LONG-NAME'] || '';
    out.push({ id, title, children: walkChildren(spec) });
  });
  return out;
}

function parseMetadata(header) {
  if (!header) return {};
  return {
    title: extractText(header.TITLE),
    creation_date: extractText(header['CREATION-DATE']),
    repository_id: extractText(header['REPOSITORY-ID']),
  };
}

// Helper to find element regardless of namespace prefix
function findElement(obj, localName) {
  if (!obj || typeof obj !== 'object') return undefined;
  // Try direct match first
  if (obj[localName] !== undefined) return obj[localName];
  // Try with common namespace prefixes
  for (const key of Object.keys(obj)) {
    const parts = key.split(':');
    if (parts.length === 2 && parts[1] === localName) {
      return obj[key];
    }
  }
  return undefined;
}

// Recursively strip namespace prefixes from all keys
function stripNamespaces(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripNamespaces);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip namespace prefix (e.g., "ns0:REQ-IF" -> "REQ-IF", "html:div" -> "div")
    const newKey = key.includes(':') ? key.split(':').pop() : key;
    result[newKey] = stripNamespaces(value);
  }
  return result;
}

async function convertFile(filePath) {
  const xml = await fs.readFile(filePath, 'utf8');
  let data = await parseStringPromise(xml, { explicitArray: false, preserveChildrenOrder: true });

  // Strip all namespace prefixes for consistent access
  data = stripNamespaces(data);

  const root = data['REQ-IF'] || data['ReqIF'] || data['reqif'] || data;
  const header = root?.['THE-HEADER']?.['REQ-IF-HEADER'] || root?.['REQ-IF-HEADER'] || {};
  const content = root?.['CORE-CONTENT']?.['REQ-IF-CONTENT'] || root?.['REQ-IF-CONTENT'] || {};

  const specObjects = content['SPEC-OBJECTS']?.['SPEC-OBJECT'] || [];
  const specRelations = content['SPEC-RELATIONS']?.['SPEC-RELATION'] || [];
  const specifications = content['SPECIFICATIONS']?.['SPECIFICATION'] || [];

  return {
    metadata: parseMetadata(header),
    requirements: parseSpecObjects(specObjects),
    relations: parseRelations(specRelations),
    specifications: parseSpecifications(specifications),
  };
}

async function main() {
  const exists = await fs
    .access(reqifDir)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    await fs.mkdir(reqifDir, { recursive: true });
  }

  const files = (await fs.readdir(reqifDir)).filter((f) => f.toLowerCase().endsWith('.reqif'));
  const byFile = {};
  for (const file of files) {
    const full = path.join(reqifDir, file);
    const parsed = await convertFile(full);
    byFile[file] = parsed;
  }

  const payload = { files, byFile };
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`ReqIF cache written to ${path.relative(projectRoot, outFile)} (files: ${files.length})`);
}

main().catch((err) => {
  console.error('ReqIF conversion failed:', err);
  process.exit(1);
});
