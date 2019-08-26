#!/bin/sh
SYSTEMCODE="SCAPE604"
SYSTEMPATH="/opt"

LOGFILE=$SYSTEMPATH/$SYSTEMCODE/log/${SYSTEMCODE}-openiod-fiware-connect-josene.log
echo "Start procedure on: " `date` >>$LOGFILE

cd $SYSTEMPATH/$SYSTEMCODE/openiod-fiware-connect
# 'pull' and 'josene' determine the name of the config file used for this session.
/usr/bin/node openiod-fiware-connect pull josene foi=[{\"id\":14540},{\"id\":14539}] >>$LOGFILE

echo "End   procedure on: " `date` >>$LOGFILE
exit 0
