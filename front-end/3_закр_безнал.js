function BeforeAct(AO, RO, E, O, CO)
{
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

			SetDept = function(gid) {
				switch (gid) {
                   case "50638901":
                        RO.Pos.SetECRDepartment(11); // Сфера
                        break;
                   default:
                        RO.Pos.SetECRDepartment(10); // Все остальные группы
                        break;
            	}				
			}

			GetBalance = function() {
				var req = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
				req.open("POST", "http://bill.st65.ru:8383/getusers.php", false);
				var parm = "address="+RO.UserValues.Get("UAccount_"+RO.Pos.Index)+"&tp=l";
				req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
				req.setRequestHeader("Content-length",parm.length);
				req.send(parm);
				var obj = eval("("+req.responseText+")");
				return obj[0].N_SUM_BAL			
			}

			ProcessHPD = function() {
				var hpdcheck = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
				var check_params = "command=check&to_account=KASSA_66&account="+encodeURIComponent(RO.UserValues.Get("UAccount_"+RO.Pos.Index))+"&sum="+encodeURIComponent(RO.Pos.SummWD);
				//AO.ShowMessage(check_params);			
				hpdcheck.open("GET", "http://bill.st65.ru:9080/kassa_card?"+check_params, false);
				hpdcheck.send(null);	
				if(hpdcheck.status == 200) {
					//AO.ShowMessage(hpdcheck.responseText);
				}
				else {
					AO.ShowMessage("HPD check request failed with status code "+hpdcheck.status);
					AO.Cancel();
				}
				var hydra_check_response = ParseXML(hpdcheck.responseText);
				var hydra_check_result = hydra_check_response.getElementsByTagName("result")[0].childNodes[0].nodeValue;
				var hydra_check_comment = hydra_check_response.getElementsByTagName("comment")[0].childNodes[0].nodeValue;
				var hydra_check_txn_id = hydra_check_response.getElementsByTagName("txn_id")[0].childNodes[0].nodeValue;
				//AO.ShowMessage("Result: "+hydra_check_result+" Comment: "+hydra_check_comment+" txn_id: "+hydra_check_txn_id);
				if (hydra_check_result == 0) {
					//Предварительная проверка пройдена
					var txn_date = GetTxnDate();
					var pay_params = "command=pay&to_account=KASSA_66&account="+encodeURIComponent(RO.UserValues.Get("UAccount_"+RO.Pos.Index))+"&sum="+encodeURIComponent(RO.Pos.SummWD)+"&txn_id="+hydra_check_txn_id+"&txn_date="+txn_date;
					var hpdpay = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
					//AO.ShowMessage(pay_params);
					hpdpay.open("GET", "http://bill.st65.ru:9080/kassa_card?"+pay_params, false);
					hpdpay.send(null);
					if(hpdpay.status == 200) {
						//AO.ShowMessage(hpdpay.responseText);
						var hydra_pay_response = ParseXML(hpdpay.responseText);
						var hydra_pay_result = hydra_pay_response.getElementsByTagName("result")[0].childNodes[0].nodeValue;
						var hydra_pay_txn_id = hydra_pay_response.getElementsByTagName("txn_id")[0].childNodes[0].nodeValue;
						var hydra_pay_comment = hydra_pay_response.getElementsByTagName("comment")[0].childNodes[0].nodeValue;
						if (hydra_pay_result == 0) {
							//Успешный платеж
							//AO.ShowMessage("Payment successfully approved with txn_id="+hydra_pay_txn_id);
						}
						else {
							AO.ShowMessage("HPD pay request failed with result: "+hydra_pay_result+" "+hydra_pay_comment);
							AO.Cancel();
						}

					}
					else {
							AO.ShowMessage("HPD pay request failed with status code "+hpdpay.status);
							AO.Cancel();
						 }
				}
				else {
						AO.ShowMessage("HPD check request failed with result: "+hydra_check_result+" "+hydra_check_comment);
						AO.Cancel();
					 }	
			}

			ProcessStorno = function() {
				var req = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
				req.open("POST", "http://bill.st65.ru:8383/process.php", false);
				var parm = "sum="+RO.Pos.SummWD+"&account="+RO.UserValues.Get("UAID_"+RO.Pos.Index)+"&to_account=k9110066&doctype="+RO.ReceiptTypeCode;
				req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
				req.setRequestHeader("Content-length",parm.length);
				req.send(parm);
				//AO.ShowMessage(parm);
				//Обрабатываем ответ сервера
                if(req.status == 200) {
                    var obj = eval("("+req.responseText+")");
                    if(obj.result != "OK") {
						AO.ShowMessage("Невозможно оплатить абоненту "+RO.UserValues.Get("UName_"+RO.Pos.Index));
                        AO.Cancel();
                    }
					else {
                        //Сторнирующий платеж успешно проведен
                    }
                }
			}
			//Entry point right here:
			switch(RO.ReceiptTypeCode)
			{
			    case 1: // ПРОДАЖА
			      ProcessHPD();
			      break;
			    case 2: // ВОЗВРАТ
			      ProcessStorno();
			      break;
			}
			
			RO.UserValues.Set("UBal_"+RO.Pos.Index,GetBalance());
			//AO.ShowMessage("Баланс " + RO.UserValues.Get("UBal_"+RO.Pos.Index));
			SetDept(RO.UserValues.Get("UGID_" + RO.Pos.Index));
		}
	}
}

function AfterAct(AO, RO, E, O, CO)
{

}

function FuncAct(AO, RO, CO)
{

}

function NoAction(AO, RO, POS, CO, UserParam)
{

}


