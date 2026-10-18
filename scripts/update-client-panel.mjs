import fs from "node:fs";
import path from "node:path";

const clientAppPath =
  process.env.CLIENT_APP_PATH || path.resolve(process.cwd(), "../client panel/src/App.tsx");
if (!fs.existsSync(clientAppPath)) {
  console.error("Client panel App.tsx not found at", clientAppPath);
  process.exit(1);
}

let code = fs.readFileSync(clientAppPath, "utf8");

const oldTarget = `    const toLine = (id: number) => {
      const item = catalog.find((i) => i.id === id);
      const isSecond =
        item?.id === 9101 ||
        item?.id === 9102 ||
        item?.sid?.startsWith('dummy-royal-orchid') ||
        item?.ownerCompanyId === 'company-2' ||
        item?.vendor === 'Royal Orchid Events';
      const ownerCompanyId = item?.ownerCompanyId || (isSecond ? 'company-2' : 'company-1');
      const ownerCompanyName =
        item?.ownerCompanyName ||
        (isSecond ? (item?.vendor || 'Royal Orchid Events') : (COS[id] || item?.vendor || 'Company 1'));
      return {
        id: item?.sid ?? String(id),
        decorationId: item?.sid ?? String(id),
        title: item?.t ?? '',
        name: item?.t ?? '',
        category: item?.cat ?? '',
        image: item?.img ?? '',
        photo: item?.img ?? '',
        price: item?.p ?? 0,
        listedPrice: item?.p ?? 0,
        description: item?.d ?? item?.specs?.summary ?? '',
        vendor: ownerCompanyName,
        ownerCompanyId,
        ownerCompanyName,
      };
    };`;

const newTarget = `    const toLine = (id: number) => {
      const item = catalog.find((i) => i.id === id);
      const isSecond =
        item?.id === 9101 ||
        item?.id === 9102 ||
        item?.sid?.startsWith('dummy-royal-orchid') ||
        item?.ownerCompanyId === 'company-2' ||
        item?.vendor === 'Royal Orchid Events';
      const ownerCompanyId = item?.ownerCompanyId || (isSecond ? 'company-2' : 'company-1');
      const ownerCompanyName =
        item?.ownerCompanyName ||
        (isSecond ? (item?.vendor || 'Royal Orchid Events') : (COS[id] || item?.vendor || 'Company 1'));

      const specs = item ? getSpecs(item) : null;
      const dimensions = specs?.dimensions || formatDimensions(item?.dimensions) || '';
      const style = item?.styles?.length ? item.styles.join(', ') : (specs?.floral?.style || '');
      const colours = item?.colors?.length ? item.colors.join(', ') : (specs?.floral?.color || '');
      const structure = specs?.structure && specs.structure !== 'Standard' ? specs.structure : (item?.cat || '');
      const platform = specs?.platform ? [specs.platform.name, specs.platform.size, specs.platform.color].filter(Boolean).join(' · ') : '';
      const lighting = specs?.lighting ? \`\${specs.lighting.name}\${specs.lighting.qty ? \` (\${specs.lighting.qty})\` : ''}\` : '';
      const flowers = specs?.floral?.style || '';

      const inclusions: string[] = [];
      if (Array.isArray(item?.inclusions) && item.inclusions.length > 0) {
        inclusions.push(...item.inclusions);
      } else {
        if (structure && structure !== 'Standard') inclusions.push(\`Structure: \${structure}\`);
        if (flowers) inclusions.push(\`Floral: \${flowers}\`);
        if (platform) inclusions.push(\`Platform: \${platform}\`);
        if (lighting) inclusions.push(\`Lighting: \${lighting}\`);
        if (specs?.addons?.length) {
          specs.addons.forEach((a: any) => inclusions.push(\`\${a.title}\${a.sub ? \` (\${a.sub})\` : ''}\`));
        }
      }

      const rawGallery = [
        item?.img,
        ...(Array.isArray(item?.images) ? item.images : []),
      ].filter((u): u is string => Boolean(u));
      const gallery = [...new Set(rawGallery)];

      return {
        id: item?.sid ?? String(id),
        decorationId: item?.sid ?? String(id),
        title: item?.t ?? '',
        name: item?.t ?? '',
        category: item?.cat ?? '',
        image: item?.img ?? '',
        photo: item?.img ?? '',
        gallery: gallery.length > 0 ? gallery : undefined,
        price: item?.p ?? 0,
        listedPrice: item?.p ?? 0,
        priceUnit: item?.priceUnit || (item as any)?.price_unit || 'per setup',
        description: item?.d ?? specs?.summary ?? '',
        inclusions: inclusions.length > 0 ? inclusions : undefined,
        style: style || undefined,
        colours: colours || undefined,
        dimensions: dimensions || undefined,
        size: dimensions || undefined,
        structure: structure || undefined,
        platform: platform || undefined,
        lighting: lighting || undefined,
        flowers: flowers || undefined,
        vendor: ownerCompanyName,
        companyName: ownerCompanyName,
        ownerCompanyId,
        ownerCompanyName,
      };
    };`;

if (!code.includes(oldTarget)) {
  console.error("Target block not found in client panel App.tsx");
  process.exit(1);
}

code = code.replace(oldTarget, newTarget);
fs.writeFileSync(clientAppPath, code, "utf8");
console.log("Successfully updated toLine in client panel App.tsx!");
