import { Series } from '@tiyo/common';
import React, { useState, useEffect } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { Modal, Button, TextInput, Checkbox } from '@mantine/core';
import { markChapters } from '@/renderer/features/library/utils';
import { chapterListState, seriesListState, seriesState } from '@/renderer/state/libraryStates';
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

const FileExceptionModal: React.FC<Props> = (props: Props) => {
    const setChapterList = useSetRecoilState(chapterListState);
    const setSeriesList = useSetRecoilState(seriesListState);
    const setSeries = useSetRecoilState(seriesState);
    const chapterLanguages = useRecoilValue(chapterLanguagesState);


    return (
        <Modal
            opened={props.showing && props.series !== null}
            centered
            title="Mark Chapters"
            onClose={props.close}
        >
            
        </Modal>
    );
};

export default FileExceptionModal;
