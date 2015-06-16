<?php
set_time_limit(180);

require_once('auth.php');
$conn = oci_connect($user, $pass, $db, 'UTF8');

if(!$conn){
    echo 'connection fail';
} else {
if ($_POST['sum'] && $_POST['account'] && $_POST['to_account'] && $_POST['doctype']){

    $sum = 1*floatval(str_replace(array(',','/','*','-','+'),'.',$_POST['sum']));
    $account = 1*$_POST['account'];
    $to_account = $_POST['to_account'];
    $doctype = 1*floatval(str_replace(array(',','/','*','-','+'),'.',$_POST['doctype']));

    $firms = array('k9110001' => 'KASSA_1', 'k9110002' => 'KASSA_2', 'k9110003' => 'KASSA_3', 'k9110004' => 'KASSA_4','k9110066' => 'KASSA_66');
    if(array_key_exists($to_account,$firms))
    {
        $query = "
        BEGIN
          MAIN.INIT(
            vch_VC_IP => '127.0.0.1',
            vch_VC_USER => 'net_interface',
            vch_VC_PASS => '".$net_interface_pass."',
            vch_VC_APP_CODE => 'NETSERV_HID',
            vch_VC_CLN_APPID => 'test');
        END;
        ";
        $stid = oci_parse($conn, $query);
        oci_execute($stid);
        if($e = oci_error($stid)){
                echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
        }

        if($doctype == 1){
            $query = "
            DECLARE
             res1 NUMBER;
             res2 DATE;
            BEGIN
             EX_PAYMENTS_PKG.EX_PAYMENTS_CHARGE(
               vch_VC_TO_BANK          => 'KASSA',
               vch_VC_TO_ACCOUNT       => '".$firms[$to_account]."',
               num_N_SUM               => ".$sum.",
               num_Fee                 => 0,
               vch_PayType             => 'RMM_KIND_Bank',
               vch_Currency            => 'RUB',
               vch_VC_TRANSACTION_ID   => '11112222',
               num_N_FORWHO_ACCOUNT_ID => ".$account.",
               dt_D_TAKING             => SYSDATE,
               num_N_DOC_ID            => res1,
               dt_D_LOAD               => res2
               );
            END;";
        }
        else {
 $query = "
                SELECT N_DOC_ID
                FROM SD_V_PAYMENTS_T
                WHERE n_forwho_account_id = ".$account."
                AND D_CREATED            IN
                (SELECT MAX(PT.D_CREATED) DT
                FROM SD_V_PAYMENTS_T PT,
                SD_V_PAYMENTS_T ST
                WHERE PT.n_forwho_account_id = ".$account."
                AND PT.N_DOC_STATE_ID        = SYS_CONTEXT('CONST', 'DOC_STATE_Actual')
                AND PT.N_STORNO_DOC_ID      IS NULL
                AND ST.N_STORNO_DOC_ID (+)   = PT.N_DOC_ID
                AND ST.N_STORNO_DOC_ID      IS NULL
                ) 
  
                ";
            $stid = oci_parse($conn, $query);
            oci_execute($stid);
            if($e = oci_error($stid)){
                    echo json_encode(array('result' => 'ERROR'),JSON_UNESCAPED_UNICODE );
                    die();
            }
            else {
                $row = oci_fetch_array($stid, OCI_ASSOC+OCI_RETURN_NULLS);
            }
            $query = "
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

        $stid = oci_parse($conn, $query);
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
