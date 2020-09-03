!define OLD_GUID_UNINSTALLER "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\c803dbba-e58a-5328-a15f-b5618df1218f"

# delete old uninstaller with wrong appId
# TODO delete on release

!macro customInit
		ReadRegStr $0 HKCU "${OLD_GUID_UNINSTALLER}" "Publisher"
    StrCmp $0 "BEST" DeleteOldEntry SkipOldEntry

    DeleteOldEntry:
        DeleteRegKey HKCU "${OLD_GUID_UNINSTALLER}"
    SkipOldEntry:
!macroend
