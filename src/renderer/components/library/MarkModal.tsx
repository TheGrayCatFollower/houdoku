import { Series } from '@tiyo/common';
import React, { useState, useEffect } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { Modal, Button, TextInput, Checkbox } from '@mantine/core';
import { markChapters } from '@/renderer/features/library/utils';
import { chapterListState, seriesListState, seriesState , sortedFilteredChapterListState} from '@/renderer/state/libraryStates';
import library from '@/renderer/services/library';
import {
    chapterLanguagesState,
} from '@/renderer/state/settingStates';
import { Chapter } from '@tiyo/common';

type Props = {
    series: Series | null;
    showing: boolean;
    close: () => void;
};

const MarkModal: React.FC<Props> = (props: Props) => {
    const setChapterList = useSetRecoilState(chapterListState);
    const setSeriesList = useSetRecoilState(seriesListState);
    const setSeries = useSetRecoilState(seriesState);
    const chapterLanguages = useRecoilValue(chapterLanguagesState);

    const [from, setFrom] = useState<number | undefined>(undefined);
    const [to, setTo] = useState<number | undefined>(undefined);
    const [isChecked, setIsChecked] = useState<boolean>(true);
    const [totalChapters, setTotalChapters] = useState<number>(0);


    const countChapters = (chapterList: Chapter[]) => {
        const grouped: { [index: string]: Chapter[] } = {};
        chapterList.forEach((chapter: Chapter) => {
            const key = chapter.chapterNumber === '' ? chapter.sourceId : chapter.chapterNumber;

            if (chapter.chapterNumber !== '' && !Number.isInteger(parseFloat(chapter.chapterNumber)))
                return;

            if (grouped[key] === undefined) {
                grouped[key] = [];
            }

            grouped[key].push(chapter);
        });

        return Object.keys(grouped).length;
    }


    useEffect(() => {
        setSeriesList(library.fetchSeriesList());
        if (props.series && props.series.id) {
            const chapters = library.fetchChapters(props.series.id);

            const filteredChapters = chapters.filter(
                (chapter) =>
                    chapterLanguages.includes(chapter.languageKey) || chapterLanguages.length === 0,
            )
            const chaptersLength = countChapters(filteredChapters)

            setTotalChapters(chaptersLength);
        }
    }, [props.series]);

    const markFromToFunc = (from: number, to: number, value: boolean) => {
        if (props.series && props.series.id) {
            const chapters = library.fetchChapters(props.series.id);

            const filteredChapters = chapters.filter((chapter) => {
                const chapterNumber = Math.floor(parseFloat(chapter.chapterNumber));
                return chapterNumber >= from && chapterNumber <= to;
            });

            markChapters(filteredChapters, props.series, value, setChapterList, setSeries, chapterLanguages);
            setSeriesList(library.fetchSeriesList());
        }
    };

    const handleMark = () => {
        if (from !== undefined && to !== undefined && isChecked !== undefined) {
            markFromToFunc(from, to, isChecked);
            props.close();
        }
    };

    const isFormValid = () => {
        return (
            from !== undefined &&
            to !== undefined &&
            from > 0 &&
            to > 0 &&
            from <= to &&
            from <= totalChapters &&
            to <= totalChapters
        );
    };

    return (
        <Modal
            opened={props.showing && props.series !== null}
            centered
            title="Mark Chapters"
            onClose={props.close}
        >
            <TextInput
                label="From Chapter"
                placeholder="Enter starting chapter number"
                type="number"
                value={from === undefined ? '' : from}
                onChange={(event) => setFrom(Number(event.currentTarget.value))}
            />

            <TextInput
                label="To Chapter"
                placeholder="Enter ending chapter number"
                type="number"
                value={to === undefined ? '' : to}
                onChange={(event) => setTo(Number(event.currentTarget.value))}
            />

            <Checkbox
                label="Mark as Read"
                checked={isChecked}
                onChange={(event) => setIsChecked(event.currentTarget.checked)}
                mt="md"
            />

            <Button onClick={handleMark} fullWidth mt="md" disabled={!isFormValid()}>
                Mark
            </Button>
        </Modal>
    );
};

export default MarkModal;
