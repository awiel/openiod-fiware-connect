#!/bin/sh
SYSTEMCODE="SCAPE604"
SYSTEMPATH="/opt"

LOGFILE=$SYSTEMPATH/$SYSTEMCODE/log/${SYSTEMCODE}-openiod-fiware-connect-ttn-arbaminch.log
echo "Start procedure on: " `date` >>$LOGFILE

cd $SYSTEMPATH/$SYSTEMCODE/openiod-fiware-connect
# 'serve' and 'knmi' determine the name of the config file used for this session.
/usr/bin/node openiod-fiware-connect ttn arbaminch >>$LOGFILE

echo "End   procedure on: " `date` >>$LOGFILE
exit 0
