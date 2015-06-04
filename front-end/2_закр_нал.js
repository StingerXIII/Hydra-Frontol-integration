function BeforeAct(AO, RO, E, O, CO)
{
	//AO.ShowMessage("Before zak "+RO.Pos.Count);
	//AO.ShowMessage(RO.Payment.PayCode);

	for(RO.Pos.Index=1;RO.Pos.Index<=RO.Pos.Count;RO.Pos.Index++){
		if(RO.Pos.SummWD == null || RO.UserValues.Get("UAID_"+RO.Pos.Index) == null || RO.ReceiptTypeCode == null || RO.Pos.SummWD == "" || RO.UserValues.Get("UAID_"+RO.Pos.Index) == "" || RO.ReceiptTypeCode == ""){
			AO.ShowMessage("Невозможно оплатить абоненту (NULL). ОТМЕНА ОПЕРАЦИИ");
			AO.Cancel();
		}
		else
		{
			//AO.ShowMessage(RO.UserValues.Get("UName_"+(RO.Pos.Index))+" - "+RO.Pos.SummWD);
			//parse xml function
			ParseXML = function (xmltext) {
				xmldoc = new ActiveXObject("Microsoft.XMLDOM");
				xmldoc.async=false;
				xmldoc.loadXML(xmltext);
				return xmldoc;
			}
			GetTxnDate = function() {
				var today = new Date();
				var dd = today.getDate();
				var mm = today.getMonth()+1; //January is 0!
				var yyyy = today.getFullYear();
				var hh24 = today.getHours();
				var mi = today.getMinutes();
				var ss = today.getSeconds();
				if (hh24<10){
				    hh24='0'+hh24
				}
				if (mi<10){
				    mi='0'+mi 
				}
				if (ss<10){
				    ss='0'+ss
				}
				if(dd<10) {
				    dd='0'+dd
				} 
				if(mm<10) {
				    mm='0'+mm
				} 
				today = yyyy+mm+dd+hh24+mi+ss;
				return today
			}
			// тест посылки запроса в hpd
			var hpdcheck = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
			var check_params = "command=check&to_account=KASSA_66&account="+encodeURIComponent(RO.UserValues.Get("UAccount_"+RO.Pos.Index))+"&sum="+encodeURIComponent(RO.Pos.SummWD);
			AO.ShowMessage(check_params);			
			hpdcheck.open("GET", "http://bill.st65.ru:9080/kassa_cash?"+check_params, false);
			hpdcheck.send(null);		
			if(hpdcheck.status == 200) {
					AO.ShowMessage(hpdcheck.responseText);
			}
			else {
				AO.ShowMessage("HPD check request failed with status code "+hpdcheck.status);
				AO.Cancel();
			}
			// TODO: запилить проверку XML-респонса и условную отправку запроса на проведение платежа.
			var hydra_check_response = ParseXML(hpdcheck.responseText);
			var hydra_check_result = hydra_check_response.getElementsByTagName("result")[0].childNodes[0].nodeValue;
			var hydra_check_comment = hydra_check_response.getElementsByTagName("comment")[0].childNodes[0].nodeValue;
			var hydra_check_txn_id = hydra_check_response.getElementsByTagName("txn_id")[0].childNodes[0].nodeValue;
			AO.ShowMessage("Result: "+hydra_check_result+" Comment: "+hydra_check_comment+" txn_id: "+hydra_check_txn_id);
			if (hydra_check_result == 0) {
				var txn_date = GetTxnDate();
				var pay_params = "command=pay&to_account=KASSA_66&account="+encodeURIComponent(RO.UserValues.Get("UAccount_"+RO.Pos.Index))+"&sum="+encodeURIComponent(RO.Pos.SummWD)+"&txn_id="+hydra_check_txn_id+"&txn_date="+txn_date;
				var hpdpay = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
				AO.ShowMessage(pay_params);
				hpdpay.open("GET", "http://bill.st65.ru:9080/kassa_cash?"+pay_params, false);
				hpdpay.send(null);
				if(hpdpay.status == 200) {
					AO.ShowMessage(hpdpay.responseText);
					var hydra_pay_response = ParseXML(hpdpay.responseText);
					var hydra_pay_result = hydra_pay_response.getElementsByTagName("result")[0].childNodes[0].nodeValue;
					var hydra_pay_txn_id = hydra_check_response.getElementsByTagName("txn_id")[0].childNodes[0].nodeValue;
					if (hydra_pay_result == 0) {
						AO.ShowMessage("Payment successfully approved with txn_id="+hydra_pay_txn_id);
					}

				}
				else {
					AO.ShowMessage("HPD pay request failed with status code "+hpdpay.status);
					AO.Cancel();
				}
			}
			else {
				AO.ShowMessage("HPD check request failed with result: "+hydra_check_result+" "+hydra_check_comment);
			}



		}
	}
}

function AfterAct(AO, RO, E, O, CO)
{
 //AO.ShowMessage("After zak");
}

function FuncAct(AO, RO, CO)
{

}

function NoAction(AO, RO, POS, CO, UserParam)
{
}


