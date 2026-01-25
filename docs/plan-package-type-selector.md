# Plan: Add Package Type Selector to Document Import Flow

## Summary
Add a "fiksni" vs "na upit" package type selector to the document import screen (`ImportMethodSelector`), allowing users to specify the package type before analyzing imported documents.

## Context
- **Fiksni** (Fixed): Agency owns/rents capacity - uses apartment-based pricing
- **Na upit** (On Request): Check availability per booking - uses hotel room pricing with meal plans

Currently, the import flow does not ask for package type. This needs to be added so the system knows how to structure the imported pricing data.

## Files to Modify

### 1. `src/components/packages/ImportMethodSelector.tsx`
**Changes:**
- Import `PackageType` from `@/types/packages`
- Import `PACKAGE_TYPE_LABELS`, `PACKAGE_TYPE_DESCRIPTIONS` from `@/lib/package-labels`
- Add state: `const [packageType, setPackageType] = useState<PackageType>('na_upit')`
- Add package type selector UI (similar to currency selector) between file preview and currency selection
- Pass `packageType` to formData in `handleUpload()`

**UI Placement (after file preview, before currency):**
```
[File Preview]
[Package Type Selector] ← NEW
[Currency Selector]
[Margin Input]
[Buttons]
```

### 2. `src/app/api/packages/import/route.ts`
**Changes:**
- Extract `package_type` from formData (line ~58)
- Pass to AI parsing functions as context (helps AI understand pricing structure)
- Include in import record or pass through to result

### 3. `src/components/packages/DocumentImportFlow.tsx`
**Changes:**
- Store `packageType` in state when received from `ImportMethodSelector`
- Pass through to `ImportReviewScreen` and save API

### 4. `src/types/import.ts`
**Changes:**
- Add `package_type?: PackageType` to `ImportFormData` interface (line ~266)
- Add `package_type?: PackageType` to `SaveImportedPackagesRequest` interface (line ~383)

### 5. `src/app/api/packages/import/save/route.ts`
**Changes:**
- Read `package_type` from request body
- Use it when creating packages in database

## Implementation Details

### Package Type Selector UI
Use similar styling to existing currency selector:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    <Building2 className="h-4 w-4 inline mr-1.5" />
    Tip paketa *
  </label>
  <div className="grid grid-cols-2 gap-3">
    {(['fiksni', 'na_upit'] as PackageType[]).map((type) => (
      <button
        key={type}
        type="button"
        onClick={() => setPackageType(type)}
        className={cn(
          'px-4 py-3 rounded-lg border-2 transition-all text-center',
          packageType === type
            ? 'border-teal-500 bg-teal-50 text-teal-700'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <span className="block font-semibold">
          {PACKAGE_TYPE_LABELS[type].split('(')[0].trim()}
        </span>
        <span className="block text-xs text-gray-500 mt-0.5">
          {PACKAGE_TYPE_DESCRIPTIONS[type]}
        </span>
      </button>
    ))}
  </div>
</div>
```

## Verification
1. Navigate to `/dashboard/packages/new`
2. Select "Importuj iz dokumenta"
3. Upload a document
4. Verify package type selector appears between file preview and currency
5. Select each option and confirm visual feedback
6. Click "Analiziraj dokument" and verify package_type flows through to saved package
