import React, { useState } from 'react';
import { Language, LanguageKey, Languages } from '@tiyo/common';
const { ipcRenderer } = require('electron');
import { useRecoilState } from 'recoil';
import {
  Button,
  Checkbox,
  Group,
  Input,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  Accordion,
} from '@mantine/core'; // Combining imports from both branches
import { IconArrowBack } from '@tabler/icons';
import { GeneralSetting } from '@/common/models/types';
import ipcChannels from '@/common/constants/ipcChannels.json';
import { createBackup, restoreBackup } from '@/renderer/util/backup';
import {
  autoBackupState,
  autoBackupCountState,
  autoCheckForUpdatesState,
  chapterLanguagesState,
  confirmRemoveSeriesState,
  customDownloadsDirState,
  libraryCropCoversState,
  refreshOnStartState,
  OnScrollingChaptersDownloadUnreadState, // From PR-337
  OnSeriesDetailsDeleteReadState,         // From PR-337
  OnSeriesDetailsDownloadUnreadState,     // From PR-337
  OnStartDownloadUnreadCountState,        // From PR-337
  OnStartUpDeleteReadState,               // From PR-337
  OnStartUpDownloadUnreadState            // From PR-337
} from '@/renderer/state/settingStates'; // Keeping @ alias for path consistency

const languageOptions = Object.values(Languages)
  .filter((language) => language.key !== LanguageKey.MULTI)
  .map((language: Language) => ({ value: language.key, label: language.name }));

const defaultDownloadsDir = await ipcRenderer.invoke(ipcChannels.GET_PATH.DEFAULT_DOWNLOADS_DIR);

// eslint-disable-next-line @typescript-eslint/ban-types
type Props = {};

const GeneralSettings: React.FC<Props> = () => {
  const [chapterLanguages, setChapterLanguages] = useRecoilState(chapterLanguagesState);
  const [refreshOnStart, setRefreshOnStart] = useRecoilState(refreshOnStartState);
  const [autoCheckForUpdates, setAutoCheckForUpdates] = useRecoilState(autoCheckForUpdatesState);
  const [autoBackup, setAutoBackup] = useRecoilState(autoBackupState);
  const [autoBackupCount, setAutoBackupCount] = useRecoilState(autoBackupCountState);
  const [confirmRemoveSeries, setConfirmRemoveSeries] = useRecoilState(confirmRemoveSeriesState);
  const [libraryCropCovers, setLibraryCropCovers] = useRecoilState(libraryCropCoversState);
  const [customDownloadsDir, setCustomDownloadsDir] = useRecoilState(customDownloadsDirState);

  const [OnStartUpDownloadUnread, setOnStartUpDownloadUnread] = useRecoilState(
    OnStartUpDownloadUnreadState
  );
  const [OnSeriesDetailsDownloadUnread, setOnSeriesDetailsDownloadUnread] = useRecoilState(
    OnSeriesDetailsDownloadUnreadState
  );
  const [OnScrollingChaptersDownloadUnread, setOnScrollingChaptersDownloadUnread] = useRecoilState(
    OnScrollingChaptersDownloadUnreadState
  );
  const [OnSeriesDetailsDeleteRead, setOnSeriesDetailsDeleteRead] = useRecoilState(
    OnSeriesDetailsDeleteReadState
  );
  const [OnStartUpDeleteRead, setOnStartUpDeleteRead] = useRecoilState(OnStartUpDeleteReadState);
  const [OnStartDownloadUnreadCount, setOnStartDownloadUnreadCount] = useRecoilState(
    OnStartDownloadUnreadCountState
  );
  const [automation, setautomation] = useState<string[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateGeneralSetting = (generalSetting: GeneralSetting, value: any) => {
    switch (generalSetting) {
      case GeneralSetting.ChapterLanguages:
        setChapterLanguages(value);
        break;
      case GeneralSetting.RefreshOnStart:
        setRefreshOnStart(value);
        break;
      case GeneralSetting.AutoCheckForUpdates:
        setAutoCheckForUpdates(value);
        break;
      case GeneralSetting.ConfirmRemoveSeries:
        setConfirmRemoveSeries(value);
        break;
      case GeneralSetting.LibraryCropCovers:
        setLibraryCropCovers(value);
        break;
      case GeneralSetting.CustomDownloadsDir:
        setCustomDownloadsDir(value);
        break;
      case GeneralSetting.autoBackup:
        setAutoBackup(value);
        break;
      case GeneralSetting.autoBackupCount:
        setAutoBackupCount(value);
        break;
      case GeneralSetting.OnStartUpDownloadUnread:
        setOnStartUpDownloadUnread(value);
        break;
      case GeneralSetting.OnStartUpDeleteRead:
        setOnStartUpDeleteRead(value);
        break;
      case GeneralSetting.OnStartUpDownloadUnreadCount:
        setOnStartDownloadUnreadCount(value);
        break;
      case GeneralSetting.OnSeriesDetailsDownloadUnread:
        setOnSeriesDetailsDownloadUnread(value);
        break;
      case GeneralSetting.OnSeriesDetailsDeleteRead:
        setOnSeriesDetailsDeleteRead(value);
        break;
      case GeneralSetting.OnScrollingChaptersDownloadUnread:
        setOnScrollingChaptersDownloadUnread(value);
        break;
      default:
        break;
    }
  };

  const handleRestoreBackup = () => {
    ipcRenderer
      .invoke(
        ipcChannels.APP.SHOW_OPEN_DIALOG,
        false,
        [
          {
            name: 'Houdoku Backup',
            extensions: ['json'],
          },
        ],
        'Select backup file',
      )
      .then((fileList: string) => {
        if (fileList.length > 0) {
          return ipcRenderer.invoke(ipcChannels.APP.READ_ENTIRE_FILE, fileList[0]);
        }
        return false;
      })
      .then((fileContent: string) => {
        if (fileContent) restoreBackup(fileContent);
      })
      .catch(console.error);
  };

  return (
    <>
      <Text>Application</Text>
      <Stack py="xs" ml="md" gap={4}>
        <Checkbox
          label="Check for Houdoku updates automatically"
          size="md"
          checked={autoCheckForUpdates}
          onChange={(e) =>
            updateGeneralSetting(GeneralSetting.AutoCheckForUpdates, e.target.checked)
          }
        />
      </Stack>

      <Text>Library</Text>
      <Stack py="xs" ml="md" gap={4}>
        <Checkbox
          label="Refresh library on startup"
          size="md"
          checked={refreshOnStart}
          onChange={(e) => updateGeneralSetting(GeneralSetting.RefreshOnStart, e.target.checked)}
        />
        <Checkbox
          label="Confirm when removing series from library"
          size="md"
          checked={confirmRemoveSeries}
          onChange={(e) =>
            updateGeneralSetting(GeneralSetting.ConfirmRemoveSeries, e.target.checked)
          }
        />
        <Checkbox
          label="Crop cover images to library grid"
          size="md"
          checked={libraryCropCovers}
          onChange={(e) => updateGeneralSetting(GeneralSetting.LibraryCropCovers, e.target.checked)}
        />
        <MultiSelect
          label="Chapter languages"
          size="sm"
          data={languageOptions}
          placeholder="Select languages (leave blank for all)"
          searchable
          value={chapterLanguages}
          onChange={(value) => updateGeneralSetting(GeneralSetting.ChapterLanguages, value)}
        />
        <Input.Wrapper label="Custom download location">
          <Input
            component="button"
            rightSection={
              <IconArrowBack
                size={20}
                style={{ display: 'block', opacity: 0.5 }}
                onClick={() => updateGeneralSetting(GeneralSetting.CustomDownloadsDir, '')}
              />
            }
            onClick={() =>
              ipcRenderer
                .invoke(ipcChannels.APP.SHOW_OPEN_DIALOG, true, [], 'Select Downloads Directory')
                .then((fileList: string) => {
                  if (fileList.length > 0) {
                    updateGeneralSetting(GeneralSetting.CustomDownloadsDir, fileList[0]);
                  }
                })
            }
          >
            {customDownloadsDir || defaultDownloadsDir}
          </Input>
        </Input.Wrapper>
      </Stack>
      <Text>Backup</Text>
      <Stack py="xs" ml="md" gap={4}>
        <Group gap="sm">
          <Button variant="default" onClick={createBackup}>
            Create Backup
          </Button>
          <Button variant="default" onClick={handleRestoreBackup}>
            Restore Backup
          </Button>
        </Group>
        <Group gap="sm" mt="xs">
          <Checkbox
            label="Automatically backup library"
            description={`Create up to ${autoBackupCount} daily backups`}
            size="md"
            checked={autoBackup}
            onChange={(e) => updateGeneralSetting(GeneralSetting.autoBackup, e.target.checked)}
          />
          <NumberInput
            w={100}
            ml={'xs'}
            value={autoBackupCount}
            min={1}
            disabled={!autoBackup}
            onChange={(value) => updateGeneralSetting(GeneralSetting.autoBackupCount, value)}
          />
        </Group>
      </Stack>

      <Text>Automation</Text>
      <Accordion multiple value={automation} onChange={setautomation}>
        <Accordion.Item value="download">
          <Accordion.Control>Auto Download</Accordion.Control>
          <Accordion.Panel>
            <Stack py="xs" ml="md" gap={4}>
              <Checkbox
                label="Download unread chapters upon startup"
                size="md"
                checked={OnStartUpDownloadUnread}
                onChange={(e) =>
                  updateGeneralSetting(GeneralSetting.OnStartUpDownloadUnread, e.target.checked)
                }
              />
              <Checkbox
                label="Download unread chapters upon loading specific manga details page"
                size="md"
                checked={OnSeriesDetailsDownloadUnread}
                onChange={(e) =>
                  updateGeneralSetting(
                    GeneralSetting.OnSeriesDetailsDownloadUnread,
                    e.target.checked
                  )
                }
              />
              <Checkbox
                label="Download unread chapters upon scrolling between chapters"
                size="md"
                checked={OnScrollingChaptersDownloadUnread}
                onChange={(e) =>
                  updateGeneralSetting(
                    GeneralSetting.OnScrollingChaptersDownloadUnread,
                    e.target.checked
                  )
                }
              />
              <Text>how many unread chapters to keep downloaded</Text>
              <NumberInput
                disabled={
                  !OnStartUpDownloadUnread &&
                  !OnSeriesDetailsDownloadUnread &&
                  !OnScrollingChaptersDownloadUnread
                }
                min={1}
                value={OnStartDownloadUnreadCount}
                onChange={(value) =>
                  updateGeneralSetting(GeneralSetting.OnStartUpDownloadUnreadCount, value)
                }
              />
              <br />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="delete">
          <Accordion.Control>Auto Delete</Accordion.Control>
          <Accordion.Panel>
            <Stack py="xs" ml="md" gap={4}>
              <Checkbox
                label="Delete read chapters upon startup"
                size="md"
                checked={OnStartUpDeleteRead}
                onChange={(e) =>
                  updateGeneralSetting(GeneralSetting.OnStartUpDeleteRead, e.target.checked)
                }
              />
              <Checkbox
                label="Delete read chapters upon loading specific manga details page"
                size="md"
                checked={OnSeriesDetailsDeleteRead}
                onChange={(e) =>
                  updateGeneralSetting(GeneralSetting.OnSeriesDetailsDeleteRead, e.target.checked)
                }
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
};

export default GeneralSettings;

export async function getDefaultDownloadDir(): Promise<any> {
  return ipcRenderer.invoke(ipcChannels.GET_PATH.DEFAULT_DOWNLOADS_DIR);
}
