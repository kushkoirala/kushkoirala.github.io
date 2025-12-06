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
        if (!text && rawVal && typeof rawVal === 'object' && rawVal.div) {
          text = extractText(rawVal.div);
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
        const xhtml = val['XHTML-CONTENT'] || val['xhtml:div'] || val['xhtml:p'];
        if (xhtml) {
          const raw = Array.isArray(xhtml) ? xhtml[0] : xhtml;
          const content = typeof raw === 'string' ? raw : '';
          if (content) attributes.description = content.trim();
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

async function convertFile(filePath) {
  const xml = await fs.readFile(filePath, 'utf8');
  const data = await parseStringPromise(xml, { explicitArray: false, preserveChildrenOrder: true });
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
