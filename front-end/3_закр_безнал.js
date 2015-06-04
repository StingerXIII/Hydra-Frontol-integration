function BeforeAct(AO, RO, E, O, CO)
{
	//AO.ShowMessage("Before zak "+RO.Pos.Count);
	//AO.ShowMessage(RO.Payment.PayCode);
	//AO.ShowMessage("Закрытие картой");
	var req = new ActiveXObject("Microsoft.XMLHTTP");
	var part2 = 0;

	for(RO.Pos.Index=1;RO.Pos.Index<=RO.Pos.Count;RO.Pos.Index++){
		if(RO.Pos.SummWD == null || RO.UserValues.Get("UAID_"+RO.Pos.Index) == null || RO.ReceiptTypeCode == null || RO.Pos.SummWD == "" || RO.UserValues.Get("UAID_"+RO.Pos.Index) == "" || RO.ReceiptTypeCode == ""){
			AO.ShowMessage("Невозможно оплатить абоненту (NULL). ОТМЕНА ОПЕРАЦИИ");
			AO.Cancel();
		}
		else{
			//AO.ShowMessage(RO.UserValues.Get("UName_"+(RO.Pos.Index))+" - "+RO.Pos.SummWD);
			req.onreadystatechange = function(){
				//Обрабатываем ответ сервера
                if(req.readyState==4 && req.status==200) {
                    var obj = eval("("+req.responseText+")");
                    if(obj.result != "OK") {
                        part2 = 0;
						AO.ShowMessage("Невозможно оплатить абоненту "+RO.UserValues.Get("UName_"+RO.Pos.Index));
                        AO.Cancel();
                    }
					else {
                        part2 = 1;
                    }
                    //AO.ShowMessage(obj[0].q);
                }
			}
			// Посылаем запрос об оплате позиции в чеке a - сумма, b - идентификатор абонента N_ACCOUNT_ID
			req.open("POST", "http://bill.st65.ru:8383/opl_bTest.php", false);
			var parm = "a="+RO.Pos.SummWD+"&b="+RO.UserValues.Get("UAID_"+RO.Pos.Index)+"&c=k9110066&d="+RO.ReceiptTypeCode;
			req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			req.setRequestHeader("Content-length",parm.length);
			req.send(parm);
			//AO.ShowMessage(parm);


		    // Бывает возникает ситуация (неизвестно из-за чего), когда в биллинг передается parm = "" и платеж не проводится.
		    // Переменная part2 нужна, чтобы платеж не прошел через кассу,т.к. Cancel() не работает в функции req.onreadystatechange()
			if(part2 == 1) {
				var req1 = new ActiveXObject("Microsoft.XMLHTTP");
				req1.onreadystatechange = function(){
					//Обрабатываем ответ сервера
					if(req1.readyState==4 && req1.status==200) {
                        var obj = eval("("+req1.responseText+")");
                        //AO.ShowMessage(obj[0]);
                        RO.UserValues.Set("UBal_"+RO.Pos.Index,obj[0].N_SUM_BAL);
                        RO.Pos.SetECRDepartment(10);
					}
				}
		    // Посылаем запрос о данных абонента после оплаты
		    req1.open("POST", "http://bill.st65.ru:8383/getusers.php", false);
		    var parm = "address="+RO.UserValues.Get("UAccount_"+RO.Pos.Index)+"&tp=l";
		    req1.setRequestHeader("Content-type","application/x-www-form-urlencoded");
		    req1.setRequestHeader("Content-length",parm.length);
		    req1.send(parm);
		    //AO.ShowMessage(parm);
		    //AO.ShowMessage("Баланс " + RO.UserValues.Get("UBal_"+RO.Pos.Index));
			}
			else {
				AO.ShowMessage("Платеж не прошел в биллинг! Повторите операцию.");
				AO.Cancel();
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


