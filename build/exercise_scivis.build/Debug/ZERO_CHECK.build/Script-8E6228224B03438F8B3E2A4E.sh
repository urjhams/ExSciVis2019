#!/bin/sh
make -C /Users/quandinh/Documents/GitHub/ExSciVis2019/build -f /Users/quandinh/Documents/GitHub/ExSciVis2019/build/CMakeScripts/ZERO_CHECK_cmakeRulesBuildPhase.make$CONFIGURATION OBJDIR=$(basename "$OBJECT_FILE_DIR_normal") all
