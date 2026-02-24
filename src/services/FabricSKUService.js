class FabricSKUService {
  // Helper to safely get SKU code or fallback
  _getSku(option) {
    return option?.option_sku_code || '';
  }

  _getName(option) {
    return option?.option_name || '';
  }

  // Base Fabric
  generateBaseFabricName(fabricName, width, process) {
    const parts = [
      this._getName(width),
      fabricName,
      this._getName(process)
    ];
    return parts.filter(Boolean).join(' ');
  }

  generateBaseFabricSKU(width, fabricName, process) {
    // Basic heuristic for fabric name SKU: First 3 chars upper case
    const fabricSku = fabricName ? fabricName.substring(0, 3).toUpperCase() : '';
    
    return [
      this._getSku(width),
      fabricSku,
      this._getSku(process)
    ].join('');
  }

  // Finish Fabric
  generateFinishFabricName(fabricName, finishWidth, processType, fabricClass, tags, process) {
    const parts = [
      this._getName(finishWidth),
      fabricName,
      this._getName(processType),
      this._getName(fabricClass),
      this._getName(tags),
      this._getName(process)
    ];
    return parts.filter(Boolean).join(' ');
  }

  generateFinishFabricSKU(finishWidth, fabricName, processType, fabricClass, tags, process) {
    const fabricSku = fabricName ? fabricName.substring(0, 3).toUpperCase() : '';
    return [
      this._getSku(finishWidth),
      fabricSku,
      this._getSku(processType),
      this._getSku(fabricClass),
      this._getSku(tags),
      this._getSku(process)
    ].join('');
  }

  // Fancy Base Fabric
  generateFancyBaseFabricName(fabricName, width, process, valueAddition, concept) {
    const parts = [
      this._getName(width),
      fabricName,
      this._getName(process),
      this._getName(valueAddition),
      this._getName(concept)
    ];
    return parts.filter(Boolean).join(' ');
  }

  generateFancyBaseFabricSKU(width, fabricName, process, valueAddition, concept) {
    const fabricSku = fabricName ? fabricName.substring(0, 3).toUpperCase() : '';
    return [
      this._getSku(width),
      fabricSku,
      this._getSku(process),
      this._getSku(valueAddition),
      this._getSku(concept)
    ].join('');
  }

  // Fancy Finish Fabric
  generateFancyFinishFabricName(fabricName, finishWidth, processType, fabricClass, tags, process, valueAddition, concept) {
    const parts = [
      this._getName(finishWidth),
      fabricName,
      this._getName(processType),
      this._getName(fabricClass),
      this._getName(tags),
      this._getName(process),
      this._getName(valueAddition),
      this._getName(concept)
    ];
    return parts.filter(Boolean).join(' ');
  }

  generateFancyFinishFabricSKU(finishWidth, fabricName, processType, fabricClass, tags, process, valueAddition, concept) {
    const fabricSku = fabricName ? fabricName.substring(0, 3).toUpperCase() : '';
    return [
      this._getSku(finishWidth),
      fabricSku,
      this._getSku(processType),
      this._getSku(fabricClass),
      this._getSku(tags),
      this._getSku(process),
      this._getSku(valueAddition),
      this._getSku(concept)
    ].join('');
  }
}

export default new FabricSKUService();