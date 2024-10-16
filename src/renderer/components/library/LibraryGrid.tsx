const fs = require('fs');
import path from 'path';
import React, {useState } from 'react';
const { ipcRenderer } = require('electron');
import { Series } from '@tiyo/common';
import { Overlay, SimpleGrid, Title } from '@mantine/core';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconChevronRight } from '@tabler/icons';
import blankCover from '@/renderer/img/blank_cover.png';
import ipcChannels from '@/common/constants/ipcChannels.json';
import constants from '@/common/constants/constants.json';
import styles from './LibraryGrid.module.css';
import {
  categoryListState,
  chapterListState,
  seriesListState,
  seriesState,
} from '@/renderer/state/libraryStates';
import {
  chapterLanguagesState,
  confirmRemoveSeriesState,
  libraryColumnsState,
  libraryCropCoversState,
  libraryViewState,
} from '@/renderer/state/settingStates';
import { goToSeries, markChapters, removeSeries } from '@/renderer/features/library/utils';
import ExtensionImage from '../general/ExtensionImage';
import { LibraryView } from '@/common/models/types';
import library from '@/renderer/services/library';

const thumbnailsDir = await ipcRenderer.invoke(ipcChannels.GET_PATH.THUMBNAILS_DIR);
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir);
}

type Props = {
  getFilteredList: () => Series[];
  showRemoveModal: (series: Series) => void;
  showMarkModal: (series: Series) => void;
};

const LibraryGrid: React.FC<Props> = (props: Props) => {
  const navigate = useNavigate();
  const setSeriesList = useSetRecoilState(seriesListState);
  const setSeries = useSetRecoilState(seriesState);
  const setChapterList = useSetRecoilState(chapterListState);
  const availableCategories = useRecoilValue(categoryListState);
  const libraryView = useRecoilValue(libraryViewState);
  const libraryColumns = useRecoilValue(libraryColumnsState);
  const chapterLanguages = useRecoilValue(chapterLanguagesState);
  const libraryCropCovers = useRecoilValue(libraryCropCoversState);
  const confirmRemoveSeries = useRecoilValue(confirmRemoveSeriesState);
  const [categoriesSubMenuOpen, setCategoriesSubMenuOpen] = useState(false);

  const viewFunc = (series: Series) => {
    goToSeries(series, setSeriesList, navigate);
  };

  const markAllReadFunc = (series: Series) => {
    if (series.id) {
      const chapters = library.fetchChapters(series.id);
      markChapters(chapters, series, true, setChapterList, setSeries, chapterLanguages);
      setSeriesList(library.fetchSeriesList());
    }
  };

  const removeFunc = (series: Series) => {
    if (confirmRemoveSeries) {
      props.showRemoveModal(series);
    } else {
      removeSeries(series, setSeriesList);
    }
  };

  const markFunc = (series: Series) => {
    props.showMarkModal(series);
  };

  const handleToggleCategory = (series: Series, categoryId: string) => {
    const categories = series.categories || [];
    let newCategories: string[] = [...categories, categoryId];
    if (categories.includes(categoryId)) {
      newCategories = categories.filter((cat) => cat !== categoryId);
    }

    library.upsertSeries({
      ...series,
      categories: newCategories,
    });
    setSeriesList(library.fetchSeriesList());
  };

  /**
   * Get the cover image source of a series.
   * If the series id is non-undefined (i.e. it is in the user's library) we first try to find the
   * downloaded thumbnail image. If it doesn't exist, we return the blankCover path.
   * @param series
   * @returns the cover image for a series, which can be put in an <img> tag
   */
  const getImageSource = (series: Series) => {
    if (series.id !== undefined) {
      const fileExtensions = constants.IMAGE_EXTENSIONS;
      for (let i = 0; i < fileExtensions.length; i += 1) {
        const thumbnailPath = path.join(thumbnailsDir, `${series.id}.${fileExtensions[i]}`);
        if (fs.existsSync(thumbnailPath)) return `atom://${thumbnailPath}`;
      }
      return blankCover;
    }

    return series.remoteCoverUrl === '' ? blankCover : series.remoteCoverUrl;
  };

  /**
   * Render the "Unread" badge on a series.
   * This is a number in a red box at the top-left of the cover, showing the number of unread
   * chapters. This is based on series.numberUnread, which is a fairly naive value obtained by
   * subtracting the highest available chapter number by the latest read chapter number (rounded).
   * See comparison.getNumberUnreadChapters for more details.
   * @param series the series to generate the badge for
   * @returns an element to include in the cover container div
   */
  const renderUnreadBadge = (series: Series) => {
    if (series.numberUnread > 0) {
      return (
        <Title
          order={5}
          className={styles.seriesUnreadBadge}
          bg="red.7"
          px={4}
          style={{ zIndex: 10 }}
        >
          {series.numberUnread}
        </Title>
      );
    }
    return <></>;
  };

  return (
    <>
      <SimpleGrid cols={libraryColumns} spacing="xs">
        {props.getFilteredList().map((series: Series) => {
          const coverSource = getImageSource(series).replaceAll('\\', '/');
          return (
            <ContextMenu.Root key={`${series.id}-${series.title}`}>
              <ContextMenu.Trigger className={styles.ContextMenuTrigger}>
                <div>
                  <div
                    className={styles.coverContainer}
                    onClick={() => viewFunc(series)}
                    style={{
                      height: libraryCropCovers ? `calc(105vw / ${libraryColumns})` : '100%',
                    }}
                  >
                    <ExtensionImage
                      url={coverSource}
                      series={series}
                      alt={series.title}
                      style={{
                        objectFit: 'cover',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    {renderUnreadBadge(series)}
                    {libraryView === LibraryView.GridCompact ? (
                      <>
                        <Title
                          className={styles.seriesTitle}
                          order={5}
                          lineClamp={3}
                          p={4}
                          pb={8}
                          style={{ zIndex: 10 }}
                        >
                          {series.title}
                        </Title>
                        <Overlay
                          h={'calc(100%)'}
                          gradient="linear-gradient(0deg, #000000cc, #00000000 40%, #00000000)"
                          zIndex={5}
                        />
                      </>
                    ) : (
                      ''
                    )}
                  </div>
                  {libraryView === LibraryView.GridComfortable ? (
                    <Title order={5} lineClamp={3} p={4}>
                      {series.title}
                    </Title>
                  ) : (
                    ''
                  )}
                </div>
              </ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content className={styles.ctxMenuContent} style={{ width: 220 }}>
                  <ContextMenu.Item className={styles.ctxMenuItem} onClick={() => viewFunc(series)}>
                    View
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    style={{ paddingLeft: 25 }}
                    className={styles.ctxMenuItem}
                    onClick={() => markAllReadFunc(series)}
                  >
                    Mark all Read
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    style={{ paddingLeft: 25 }}
                    className={styles.ctxMenuItem}
                    onClick={() => markFunc(series)}
                  >
                    Mark Range
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className={styles.ctxMenuItem}
                    onClick={() => removeFunc(series)}
                  >
                    Remove
                  </ContextMenu.Item>
                  {availableCategories.length > 0 ? (
                    <ContextMenu.Sub open={categoriesSubMenuOpen}>
                      <ContextMenu.SubTrigger
                        className={styles.ctxMenuItem}
                        onPointerEnter={() => setCategoriesSubMenuOpen(true)}
                        onPointerLeave={() => setCategoriesSubMenuOpen(false)}
                      >
                        Categories
                        <div style={{ marginLeft: 'auto' }}>
                          <IconChevronRight />
                        </div>
                      </ContextMenu.SubTrigger>
                      <ContextMenu.Portal>
                        <ContextMenu.SubContent
                          className={`${styles.ctxMenuContent} ${styles.ctxSubMenuContent}`}
                          sideOffset={2}
                          alignOffset={-5}
                          onPointerEnter={() => setCategoriesSubMenuOpen(true)}
                          onPointerLeave={() => setCategoriesSubMenuOpen(false)}
                        >
                          {availableCategories.map((category) => {
                            return (
                              <ContextMenu.CheckboxItem
                                key={category.id}
                                className={styles.ctxMenuItem}
                                checked={
                                  series.categories && series.categories.includes(category.id)
                                }
                                onCheckedChange={() => {
                                  handleToggleCategory(series, category.id);
                                  setCategoriesSubMenuOpen(false);
                                }}
                              >
                                <ContextMenu.ItemIndicator className={styles.ctxMenuItemIndicator}>
                                  <IconCheck width={18} height={18} />
                                </ContextMenu.ItemIndicator>
                                {category.label}
                              </ContextMenu.CheckboxItem>
                            );
                          })}
                        </ContextMenu.SubContent>
                      </ContextMenu.Portal>
                    </ContextMenu.Sub>
                  ) : (
                    ''
                  )}
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
          );
        })}
      </SimpleGrid>
    </>
  );
};

export default LibraryGrid;
