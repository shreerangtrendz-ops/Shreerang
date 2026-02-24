// This component acts as a utility to map fabric names to field values
// It follows the task requirements to "Accept selectedFabric prop and return mapped field values object"
// Implemented as a pure function for better performance and usage in hooks/handlers

export const getMappedFields = (selectedFabric) => {
  if (!selectedFabric) return {};

  const map = {
    'Cotton': { base: 'Cotton', yarnType: 'Cotton' },
    'Polyester': { base: 'Polyester', yarnType: 'Polyester' },
    'Silk': { base: 'Silk', yarnType: 'Silk' },
    'Linen': { base: 'Linen', yarnType: 'Linen' },
    'Viscose': { base: 'Viscose', yarnType: 'Viscose' },
    'Wool': { base: 'Wool', yarnType: 'Wool' },
    'Blend': { base: 'Blend', yarnType: 'Blend' }
  };

  return map[selectedFabric] || {};
};

// If a React Component structure is strictly required by some architecture (unlikely but safe to include)
const FabricFieldMapper = ({ selectedFabric }) => {
  return getMappedFields(selectedFabric);
};

export default FabricFieldMapper;