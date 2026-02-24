/**
 * Utility to calculate completion status of fabric items
 */

export const getCompletionStats = (item, type) => {
  let requiredFields = [];
  let optionalFields = [];
  let filledCount = 0;
  let missing = [];

  // Define fields based on type
  if (type === 'base_fabric') {
    requiredFields = ['base_fabric_name', 'hsn_code', 'base', 'width'];
    optionalFields = ['alias_names', 'description', 'gsm', 'weight'];
  } else if (type === 'finish_fabric') {
    // Finish fabric requires base fabric connection + its own fields
    requiredFields = ['base_fabric_id', 'class', 'process', 'process_type', 'tag'];
    optionalFields = ['design_numbers', 'design_names', 'description', 'dye_used'];
  } else if (type === 'fancy_finish_fabric') {
    // Fancy requires finish fabric connection + value addition
    requiredFields = ['finish_fabric_id', 'value_addition_type'];
    optionalFields = ['description', 'embroidery_type', 'hakoba_type'];
  }

  // Check required fields
  requiredFields.forEach(field => {
    const val = item[field];
    if (val && val.toString().trim() !== '') {
      filledCount++;
    } else {
      missing.push({ field, type: 'required' });
    }
  });

  // Calculate percentage (only based on required fields for critical completion)
  const totalRequired = requiredFields.length;
  const percentage = totalRequired === 0 ? 100 : Math.round((filledCount / totalRequired) * 100);

  // Determine status color
  let statusColor = 'bg-red-500'; // Default red
  if (percentage >= 100) statusColor = 'bg-green-500';
  else if (percentage >= 67) statusColor = 'bg-green-300';
  else if (percentage >= 34) statusColor = 'bg-yellow-500';

  return {
    percentage,
    missingFields: missing,
    statusColor,
    isComplete: percentage === 100
  };
};

export const getFabricItemName = (item, type) => {
    if (type === 'base_fabric') return item.base_fabric_name;
    if (type === 'finish_fabric') return item.finish_fabric_name || `${item.base_fabric?.base_fabric_name || 'Base'} ${item.process_type || ''}`;
    if (type === 'fancy_finish_fabric') return item.fancy_finish_name || `${item.finish_fabric?.finish_fabric_name || 'Finish'} ${item.value_addition_type || ''}`;
    return 'Unknown Item';
};