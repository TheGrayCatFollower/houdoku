import React, { useEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { flushSync } from 'react-dom';
import styles from './ReaderViewer.module.css';
import { ReadingDirection, PageStyle } from '@/common/models/types';
import {
  lastPageNumberState,
  pageGroupListState,
  pageNumberState,
  pageUrlsState,
  seriesState,
} from '@/renderer/state/readerStates';
import {
  fitContainToWidthState,
  fitContainToHeightState,
  fitStretchState,
  pageStyleState,
  readingDirectionState,
  hideScrollbarState,
  pageGapState,
  optimizeContrastState,
  maxPageWidthState,
  pageWidthMetricState,
} from '@/renderer/state/settingStates';
import ExtensionImage from '../general/ExtensionImage';
import * as ContextMenu from '@radix-ui/react-context-menu';
import crypto from 'crypto';
const { ipcRenderer } = require('electron');
import ipcChannels from '@/common/constants/ipcChannels.json';
import { v4 as uuidv4 } from 'uuid';
import { showNotification, updateNotification } from '@mantine/notifications';

const ROOT_ID = 'root';

type Props = {
  changePage: (left: boolean, toBound?: boolean) => void;
  updatePageGroupList: () => void;
};

const ReaderViewer: React.FC<Props> = (props: Props) => {
  const viewerContainer = useRef<HTMLDivElement>(null);
  const series = useRecoilValue(seriesState);
  const [skipChangePageNumEffect, setSkipChangePageNumEffect] = useState(false);
  const [pageNumber, setPageNumber] = useRecoilState(pageNumberState);
  const lastPageNumber = useRecoilValue(lastPageNumberState);
  const pageUrls = useRecoilValue(pageUrlsState);
  const pageGroupList = useRecoilValue(pageGroupListState);
  const fitContainToWidth = useRecoilValue(fitContainToWidthState);
  const fitContainToHeight = useRecoilValue(fitContainToHeightState);
  const fitStretch = useRecoilValue(fitStretchState);
  const pageStyle = useRecoilValue(pageStyleState);
  const readingDirection = useRecoilValue(readingDirectionState);
  const hideScrollbar = useRecoilValue(hideScrollbarState);
  const pageGap = useRecoilValue(pageGapState);
  const [maxPageWidth, setMaxPageWidth] = useRecoilState(maxPageWidthState);
  const pageWidthMetric = useRecoilValue(pageWidthMetricState);
  const optimizeContrast = useRecoilValue(optimizeContrastState);

  const viewerContainerClickHandler = (e: React.MouseEvent) => {
    if (pageStyle === PageStyle.LongStrip) {
      const visibleHeight = window.innerHeight;
      if (e.clientY > visibleHeight * 0.6) {
        props.changePage(false);
      } else if (e.clientY < visibleHeight * 0.4) {
        props.changePage(true);
      }
    } else {
      const visibleWidth = window.innerWidth;
      if (e.clientX > visibleWidth * 0.6) {
        props.changePage(false);
      } else if (e.clientX < visibleWidth * 0.4) {
        props.changePage(true);
      }
    }
  };

  const getPageImage = (num: number, showing: boolean) => {
    let isLeft = false;
    let isRight = false;
    const pageGroup = pageGroupList.find((group) => group.includes(pageNumber));
    if (pageStyle === PageStyle.Double && pageGroup && pageGroup.length > 1) {
      if (readingDirection === ReadingDirection.LeftToRight) {
        isLeft = num === pageGroup[0];
        isRight = num === pageGroup[1];
      } else {
        isRight = num === pageGroup[0];
        isLeft = num === pageGroup[1];
      }
    }

    const copyToClipboard = (str: string, message: string) => {
      ipcRenderer.invoke(ipcChannels.APP.COPY_TO_CLIPBOARD, str).finally(() => {
        const notificationId = uuidv4();
        showNotification({
          id: notificationId,
          message: (message),
          loading: false,
          autoClose: true,
        });
      });
    };

    const generateMD5Hash = async (url: string) => {
      return ipcRenderer.invoke(ipcChannels.APP.GENERATE_HASH, url);
    };

    return (
      <ContextMenu.Root key={`${num}}`}>
        <ContextMenu.Trigger className={styles.ContextMenuTrigger}>
          <ExtensionImage
            // @ts-expect-error ignoring ensured series prop in this context
            series={series}
            key={num}
            data-num={num}
            url={pageUrls[num - 1]}
            alt={`Page ${num}`}
            style={showing ? {} : { display: 'none' }}
            loadingDisplay="spinner"
            allowRetry
            onLoad={props.updatePageGroupList}
            className={`
      ${styles.pageImage}
      ${optimizeContrast ? styles.optimizeContrast : ''}
      ${isLeft ? styles.left : ''}
      ${isRight ? styles.right : ''}
      ${fitContainToWidth ? styles.containWidth : ''}
      ${fitContainToHeight ? styles.containHeight : ''}
      ${fitStretch && (fitContainToWidth || fitContainToHeight) ? styles.grow : ''}
      ${(pageStyle === PageStyle.Double || pageStyle === PageStyle.LongStrip) && pageGap
                ? styles.gap
                : ''
              }
    `}
          />
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content
            className={styles.ctxMenuContent}
            style={{ width: 220 }}
          >
            {
              <>
                <ContextMenu.Item
                  style={{ paddingLeft: 25 }}
                  className={styles.ctxMenuItem}
                  onClick={() => copyToClipboard(pageUrls[num - 1], "URL saved to clipboard")}

                >
                  Copy image url
                </ContextMenu.Item>

                <ContextMenu.Item
                  style={{ paddingLeft: 25 }}
                  className={styles.ctxMenuItem}
                  onClick={() => {
                    generateMD5Hash(pageUrls[num - 1]).then(value => {
                      copyToClipboard(value, "Hash saved to clipboard");
                    })
                  }}
                >
                  Copy image hash
                </ContextMenu.Item>


              </>

            }

          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

    );
  };

  /**
   * Get the page container, which contains all page images (with only the current one(s) shown).
   *
   * This is used for the Single and Double page styles.
   */
  const getSinglePageContainer = () => {
    let pageImages = [];
    for (let i = 1; i <= lastPageNumber; i += 1) {
      const pageGroup = pageGroupList.find((group) => group.includes(pageNumber));

      let shownInDouble = false;
      if (pageStyle === PageStyle.Double && pageGroup !== undefined) {
        shownInDouble = pageGroup.includes(i);
      }

      const showing = i === pageNumber || shownInDouble;
      pageImages.push(getPageImage(i, showing));
    }

    // in the Double style, the image on the right needs to be at a later index
    // in the array -- therefore in right-to-left mode, we need to reverse the array
    if (readingDirection === ReadingDirection.RightToLeft) {
      pageImages = pageImages.reverse();
    }

    return (
      <div
        className={`
            ${styles.page}
            ${fitContainToWidth ? styles.containWidth : ''}
            ${fitContainToHeight ? styles.containHeight : ''}
            ${fitStretch && (fitContainToWidth || fitContainToHeight) ? styles.grow : ''}
          `}
      >
        {pageImages}
      </div>
    );
  };

  /**
   * Get the page containers, with one per page image.
   *
   * This is used for the LongStrip page style. Unlike getSinglePageContainer(), this method
   * creates a separate container per page,
   *
   * All containers and pages are rendered with this layout (i.e. this doesn't use display:none).
   * The Double and LongStrip layouts are mutually exclusive.
   */
  const getSeparatePageContainers = () => {
    const pageContainers = [];
    for (let i = 1; i <= lastPageNumber; i += 1) {
      pageContainers.push(
        <div
          key={i}
          className={`
            ${styles.page}
            ${fitContainToWidth ? styles.containWidth : ''}
            ${fitContainToHeight ? styles.containHeight : ''}
            ${fitStretch && (fitContainToWidth || fitContainToHeight) ? styles.grow : ''}
          `}
        >
          {getPageImage(i, true)}
        </div>,
      );
    }
    return pageContainers;
  };

  /**
   * Add handling to update the page number when scrolling.
   *
   * Only updates the page number when on the LongStrip style.
   */
  useEffect(() => {
    const root = document.getElementById(ROOT_ID);
    const readerPage = root?.firstElementChild;

    if (root && readerPage) {
      if (pageStyle === PageStyle.LongStrip) {
        root.onscroll = () => {
          if (viewerContainer.current) {
            let imageHeightSum = 0;

            let childNum = 0;
            for (
              childNum = 0;
              childNum < viewerContainer.current.children.length &&
              imageHeightSum <
              root.scrollTop +
              root.clientHeight -
              parseInt(getComputedStyle(readerPage).marginTop, 10);
              childNum += 1
            ) {
              imageHeightSum += viewerContainer.current.children[childNum].clientHeight;
            }

            if (pageNumber !== childNum && childNum <= lastPageNumber && childNum > 0) {
              // TODO: force ignore automatic batching. Prefer to replace this with
              // detection from ScrollArea
              flushSync(() => {
                setSkipChangePageNumEffect(true);
                setPageNumber(childNum);
              });
            }
          }
        };
      } else {
        root.onscroll = () => true;
      }
    }
  }, [pageStyle, lastPageNumber, pageNumber]);

  /**
   * Scrolls to the current page number when it is changed.
   *
   * This is primarily for the LongStrip style, but on Single/Double
   * we also scroll up to the top since the user may have scrolled
   * to the button of the previous page.
   */
  useEffect(() => {
    if (pageStyle === PageStyle.LongStrip) {
      if (skipChangePageNumEffect) {
        setSkipChangePageNumEffect(false);
      } else if (viewerContainer.current) {
        const elem = viewerContainer.current.children[pageNumber - 1];
        if (elem !== undefined) {
          elem.scrollIntoView();

          // if we're not scrolling to the last page, need to scroll up some
          // since the image is covered by the header
          const root = document.getElementById(ROOT_ID);
          const readerPage = root?.firstElementChild;
          if (root && readerPage && pageNumber < lastPageNumber) {
            root.scrollTop -= parseInt(getComputedStyle(readerPage).marginTop, 10);
          }
        }
      }
    } else {
      const root = document.getElementById(ROOT_ID);
      if (root) root.scrollTop = 0;
    }
  }, [pageStyle, pageNumber, lastPageNumber]);

  const handleScroll = (e: WheelEvent) => {
    if (e.ctrlKey) {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      setMaxPageWidth((maxPageWidth) => {
        const newWidth = e.deltaY < 0 ? maxPageWidth + 10 : maxPageWidth - 10;
        const clampedDown = Math.max(newWidth, 10);
        const clampedUp =
          pageWidthMetric === '%'
            ? Math.min(clampedDown, 100)
            : Math.min(clampedDown, window.innerWidth);
        return clampedUp;
      });
    }
  };

  useEffect(() => {
    window.addEventListener('wheel', handleScroll);
    return () => {
      window.removeEventListener('wheel', handleScroll);
    };
  }, [pageWidthMetric]);

  return (
    <>
      {/* {props.overlayPageNumber ? renderPageNumberOverlay() : <></>} */}
      <div
        ref={viewerContainer}
        className={`
          ${styles.container}
          ${hideScrollbar ? styles.noScrollbar : ''}`}
        style={{ ['--USER-MAX-PAGE-WIDTH' as string]: `${maxPageWidth}${pageWidthMetric}` }}
        onClick={(e) => viewerContainerClickHandler(e)}
      >
        {pageStyle === PageStyle.LongStrip ? getSeparatePageContainers() : getSinglePageContainer()}
      </div>
    </>
  );
};

export default ReaderViewer;