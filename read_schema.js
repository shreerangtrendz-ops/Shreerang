const fs = require('fs');
const txt = fs.readFileSync('test_schema.txt', 'utf8');
console.log("ISSUE_TO_MILL:");
console.log(txt.split('\n')[0].substring(15).split(',').join('\n'));
console.log("\nRECEIPT_PAYMENT_LINES:");
console.log(txt.split('\n')[1].substring(23).split(',').join('\n'));
