# Fabric Master Verification Checklist

## Functional Testing
- [x] **Base Fabric CRUD**: Create, Read, Update, Delete works.
- [x] **Finish Fabric CRUD**: Inheritance from Base works.
- [x] **Fancy Finish CRUD**: Inheritance from Finish works.
- [x] **Grouping**: Items group correctly by Base/Process.
- [x] **Filters**: All advanced filters return correct results.

## UI/UX
- [x] **Responsive**: Tables scroll on mobile, cards stack.
- [x] **Feedback**: Toasts appear on success/error.
- [x] **Loading**: Skeletons/Spinners show during fetch.

## Bulk Operations
- [x] **Selection**: Select All/Group/Single works.
- [x] **Toolbar**: Appears only when items selected.
- [x] **Delete**: Modal shows correct dependency counts.

## Security
- [x] **RLS**: Regular users cannot delete fabrics.
- [x] **Validation**: Cannot save fabric without Name.