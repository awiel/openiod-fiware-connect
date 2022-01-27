#!/bin/sh
SYSTEMCODE="SCAPE604"
SYSTEMPATH="/opt"
SERVICE="visibilis"

LOGFILE=$SYSTEMPATH/$SYSTEMCODE/log/${SYSTEMCODE}-openiod-fiware-connect-transfer-${SERVICE}.log
echo "Start procedure on: " `date` >>$LOGFILE

cd $SYSTEMPATH/$SYSTEMCODE/openiod-fiware-connect

# 'transfer' and 'one' determine the name of the config file used for this session.
/usr/bin/node openiod-fiware-connect transfer ${SERVICE} {} >>$LOGFILE

echo "End   procedure on: " `date` >>$LOGFILE
exit 0
