#!/bin/sh
SYSTEMCODE="SCAPE604"
SYSTEMPATH="/opt"

LOGFILE=$SYSTEMPATH/$SYSTEMCODE/log/${SYSTEMCODE}-openiod-fiware-connect-server-luchtmeetnet.log
echo "Start procedure on: " `date` >>$LOGFILE

cd $SYSTEMPATH/$SYSTEMCODE/openiod-fiware-connect
# 'serve' and 'luchtmeetnet' determine the name of the config file used for this session.
/usr/bin/node openiod-fiware-connect serve luchtmeetnet >>$LOGFILE

echo "End   procedure on: " `date` >>$LOGFILE
exit 0
