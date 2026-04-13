const fetch = globalThis.fetch;
async function dump() {
  const xml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Ledger</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>SheeRang Trendz Pvt. Ltd.</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <COLLECTION ISODBC="No">
            <TYPE>Ledger</TYPE>
            <FETCH>Name,Address,LedgerPhone,LedgerMobile,Email,GSTRegistrationNumber,PinCode,LedgerState,CreditPeriod,CreditLimit,PartyGSTType,PARTYGSTIN</FETCH>
            <FILTERS>NameFilter</FILTERS>
          </COLLECTION>
          <SYSTEM>
            <FORMULAE>
              <NAME>NameFilter</NAME>
              <TEXT>$Name = "16 Fire Creation Pvt Ltd"</TEXT>
            </FORMULAE>
          </SYSTEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
  try {
    const res = await fetch('http://172.19.0.1:9080', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xml
    });
    console.log(await res.text());
  } catch(e) {
    console.error(e);
  }
}
dump();
