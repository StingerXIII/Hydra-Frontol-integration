<?php

set_time_limit(180);

requre_once('auth.php');
$conn = oci_connect($user, $pass, $db, 'UTF8');

if(!$conn){
    echo 'connection fail';
} else {
if ($_POST['a'] && $_POST['b'] && $_POST['c'] && $_POST['d']){
    
    $a = 1*floatval(str_replace(array(',','/','*','-','+'),'.',$_POST['a']));
    $b = 1*$_POST['b'];
    $c = $_POST['c'];
    $d = 1*floatval(str_replace(array(',','/','*','-','+'),'.',$_POST['d']));

    $firms = array('k9110066' => 'KASSA_66');
    if(array_key_exists($c,$firms))
    {
        $q = "
        BEGIN
          MAIN.INIT(
            vch_VC_IP => '127.0.0.1',
            vch_VC_USER => 'net_interface',
            vch_VC_PASS => '".$net_interface_pass."',
            vch_VC_APP_CODE => 'NETSERV_HID',
            vch_VC_CLN_APPID => 'test');
        END;
        ";
        $stid = oci_parse($conn, $q);
        oci_execute($stid);
        if($e = oci_error($stid)){
        	echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
        }

        if($d == 1){
            $q = "
            DECLARE
             res1 NUMBER;
             res2 DATE;
            BEGIN
             EX_PAYMENTS_PKG.EX_PAYMENTS_CHARGE(
               vch_VC_TO_BANK          => 'KASSA',
               vch_VC_TO_ACCOUNT       => '".$firms[$c]."',
               num_N_SUM               => ".$a.",
               num_Fee                 => 0,
               vch_PayType             => 'RMM_KIND_Bank',
               vch_Currency            => 'RUB',
               vch_VC_TRANSACTION_ID   => '11112222',
               num_N_FORWHO_ACCOUNT_ID => ".$b.",
               dt_D_TAKING             => SYSDATE,
               num_N_DOC_ID            => res1,
               dt_D_LOAD               => res2
               );
	    END;";//1159480801
        }
        else {
            $q = "
                select N_DOC_ID from
                    SD_V_PAYMENTS_T
                where
                    n_forwho_account_id = ".$b."
                    and d_time in (
                        SELECT max(PT.D_TIME) DT
                        FROM SD_V_PAYMENTS_T PT
                        WHERE
                        PT.N_DOC_STATE_ID       = SYS_CONTEXT('CONST', 'DOC_STATE_Actual')
                        AND pt.n_forwho_account_id = ".$b."
                        )
                ";
            $stid = oci_parse($conn, $q);
            oci_execute($stid);
            if($e = oci_error($stid)){
                    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
                    die();
            }
            else {
                $row = oci_fetch_array($stid, OCI_ASSOC+OCI_RETURN_NULLS);
            }
            $q = "
                DECLARE
                  num_N_DOC_ID_NEW NUMBER := NULL;
                  num_N_DOC_ID NUMBER := ".$row['N_DOC_ID'].";
                BEGIN
                SD_DOCUMENTS_PKG.SD_DOCUMENTS_COPY(
                  num_N_DOC_ID_OLD => num_N_DOC_ID,
                  num_N_DOC_ID_NEW => num_N_DOC_ID_NEW,
                  num_N_STORNO_DOC_ID => num_N_DOC_ID);
                SD_DOCUMENTS_PKG.SD_DOCUMENTS_CHANGE_STATE(
                  num_N_DOC_ID => num_N_DOC_ID_NEW,
                  num_N_NEW_DOC_STATE_ID => 4003);
                END;
            ";

        }

        $stid = oci_parse($conn, $q);
        oci_execute($stid);

	if($e = oci_error($stid)){
	    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
        } else {
	    echo json_encode(array('result' => 'OK'),JSON_UNESCAPED_UNICODE );
        }
        oci_close($conn);
    }
    else
    {
	echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );

    }
} else {
    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
}
}

?>