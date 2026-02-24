export const generateWhatsAppLink = (order, items, totals, customer, agent, transport, terms) => {
  if (!order || !customer) return '';

  const date = new Date(order.date).toLocaleDateString('en-IN');
  const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : 'TBD';

  let itemsList = items.map((item, index) => {
    const name = item.desc || (item.item_type === 'ready_made' ? item.product_name : item.fabric_name) || 'Item';
    const design = item.design_number ? `(Des: ${item.design_number})` : '';
    const qtyUnit = item.item_type === 'ready_made' ? `${item.qty} Pcs` : `${item.qty} ${item.unit || 'Mtr'}`;
    return `${index + 1}. ${name} ${design}\n   ${qtyUnit} x ₹${item.rate} = ₹${item.amount.toFixed(2)}`;
  }).join('\n');

  const agentInfo = agent ? `\n*Agent:* ${agent.agent_name} (${agent.phone})` : '';
  const transportInfo = transport ? `\n*Transport:* ${transport.transport_name}` : '';
  const creditTerms = customer.credit_days > 0 ? `\n*Payment Terms:* Net ${customer.credit_days} Days` : '';

  const message = `*SALES ORDER SUMMARY*
Order #: ${order.orderNo}
Date: ${date}
Delivery: ${deliveryDate}

*Firm Name:* ${customer.name}
*Billing Address:* ${customer.address}, ${customer.city} - ${customer.pincode}
*Contact:* ${customer.contact_person || customer.name} (${customer.phone})
*GST:* ${customer.gst_number || 'N/A'}${creditTerms}${agentInfo}${transportInfo}

*Items:*
${itemsList}

------------------------
*Subtotal:* ₹${totals.gross.toFixed(2)}
${totals.discountAmount > 0 ? `Discount: -₹${totals.discountAmount.toFixed(2)}\n` : ''}
${totals.foldAmount > 0 ? `Fold Benefit (${totals.foldBenefitPercent}%): -₹${totals.foldAmount.toFixed(2)}\n` : ''}
${totals.brokerageAmount > 0 ? `Brokerage: ${totals.brokerageAmount.toFixed(2)}` : ''}
${totals.transportAmt > 0 ? `Transport Chg: +₹${totals.transportAmt.toFixed(2)}\n` : ''}
${totals.gstAmount > 0 ? `GST: +₹${totals.gstAmount.toFixed(2)}\n` : ''}
*FINAL TOTAL: ₹${totals.final.toFixed(2)}*
------------------------

${terms ? `*Terms & Conditions:*\n${terms}\n` : ''}
Prepared by: ${order.preparedBy}
`;

  const encodedMessage = encodeURIComponent(message);
  const phone = customer.phone?.replace(/\D/g, '') || '';
  
  return `https://wa.me/${phone}?text=${encodedMessage}`;
};