/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { hasRequiredScopes } from "@wso2is/core/helpers";
import { EmptyPlaceholder, LinkButton, PrimaryButton } from "@wso2is/react-components";
import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { useDispatch,useSelector } from "react-redux";
import { DropdownItemProps, DropdownProps, Icon, PaginationProps } from "semantic-ui-react";
import { getADialect, getAllLocalClaims } from "../api";
import { addAlert } from "@wso2is/core/store";
import { AdvancedSearchWithBasicFilters, ClaimsList, ListType } from "../components";
import { AddLocalClaims } from "../components";
import { EmptyPlaceholderIllustrations } from "../configs";
import { CLAIM_DIALECTS_PATH, UserConstants } from "../constants";
import { history } from "../helpers";
import { ListLayout } from "../layouts";
import { PageLayout } from "../layouts";
import { AlertLevels, Claim, ClaimsGetParams, FeatureConfigInterface } from "../models";
import { AppState } from "../store";
import { filterList, sortList } from "../utils";
import { useTranslation } from "react-i18next";

/**
 * This returns the list of local claims.
 *
 * @return {ReactElement}
 */
export const LocalClaimsPage = (): ReactElement => {

    /**
     * Sets the attributes by which the list can be sorted
     */
    const SORT_BY = [
        {
            key: 0,
            text: "Name",
            value: "displayName"
        },
        {
            key: 1,
            text: "Attribute URI",
            value: "claimURI"
        }
    ];

    const featureConfig: FeatureConfigInterface = useSelector((state: AppState) => state.config.features);

    const [ claims, setClaims ] = useState<Claim[]>(null);
    const [ offset, setOffset ] = useState(0);
    const [ listItemLimit, setListItemLimit ] = useState<number>(0);
    const [ openModal, setOpenModal ] = useState(false);
    const [ claimURIBase, setClaimURIBase ] = useState("");
    const [ filteredClaims, setFilteredClaims ] = useState<Claim[]>(null);
    const [ sortBy, setSortBy ] = useState<DropdownItemProps>(SORT_BY[ 0 ]);
    const [ sortOrder, setSortOrder ] = useState(true);
    const [ query, setQuery ] = useState("");
    const [ isLoading, setIsLoading ] = useState(true);

    const dispatch = useDispatch();

    const initialRender = useRef(true);

    const { t } = useTranslation();

    /**
    * Fetches all the local claims.
    *
    * @param {number} limit.
    * @param {number} offset.
    * @param {string} sort.
    * @param {string} filter.
    */
    const getLocalClaims = (limit?: number, sort?: string, offset?: number, filter?: string) => {
        setIsLoading(true);
        const params: ClaimsGetParams = {
            filter: filter || null,
            limit: limit || null,
            offset: offset || null,
            sort: sort || null
        };
        getAllLocalClaims(params).then(response => {
            setClaims(response);
            setFilteredClaims(response);
        }).catch(error => {
            dispatch(addAlert(
                {
                    description: error?.description || "There was an error while fetching the local attribute",
                    level: AlertLevels.ERROR,
                    message: error?.message || "Something went wrong"
                }
            ));
        }).finally(() => {
            setIsLoading(false);
        });
    };

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
        } else {
            setFilteredClaims(sortList(filteredClaims, sortBy.value as string, sortOrder));
        }
    }, [ sortBy, sortOrder ]);

    useEffect(() => {
        setListItemLimit(UserConstants.DEFAULT_USER_LIST_ITEM_LIMIT);
        getLocalClaims(null, null, null, null);
        getADialect("local").then((response) => {
            setClaimURIBase(response.dialectURI);
        }).catch(error => {
            dispatch(addAlert(
                {
                    description: error?.description || "There was an error while fetching the local dialect",
                    level: AlertLevels.ERROR,
                    message: error?.message || "Something went wrong"
                }
            ));
        });
    }, []);

    /**
    * This slices a portion of the list to display.
     *
    * @param {ClaimDialect[]} list.
    * @param {number} limit.
    * @param {number} offset.
     *
    * @return {ClaimDialect[]} Paginated List.
    */
    const paginate = (list: Claim[], limit: number, offset: number): Claim[] => {
        return list?.slice(offset, offset + limit);
    };

    /**
    * Handles change in the number of items to show.
     *
    * @param {React.MouseEvent<HTMLAnchorElement>} event.
    * @param {data} data.
    */
    const handleItemsPerPageDropdownChange = (event: React.MouseEvent<HTMLAnchorElement>, data: DropdownProps) => {
        setListItemLimit(data.value as number);
    };

    /**
    * Paginates.
    *
    * @param {React.MouseEvent<HTMLAnchorElement>} event.
    * @param {PaginationProps} data.
    */
    const handlePaginationChange = (event: React.MouseEvent<HTMLAnchorElement>, data: PaginationProps) => {
        setOffset((data.activePage as number - 1) * listItemLimit);
    };

    /**
    * Handle sort strategy change.
     *
    * @param {React.SyntheticEvent<HTMLElement>} event.
    * @param {DropdownProps} data.
    */
    const handleSortStrategyChange = (event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => {
        setSortBy(SORT_BY.filter(option => option.value === data.value)[ 0 ]);
    };

    /**
    * Handles sort order change.
    *
    * @param {boolean} isAscending.
    */
    const handleSortOrderChange = (isAscending: boolean) => {
        setSortOrder(isAscending);
    };

    /**
     * Handles the `onFilter` callback action from the
     * advanced search component.
     *
     * @param {string} query - Search query.
     */
    const handleLocalClaimsFilter = (query: string): void => {
        try {
            const filteredClaims = filterList(claims, query, sortBy.value as string, sortOrder);
            setFilteredClaims(filteredClaims);
        } catch (error) {
            dispatch(addAlert({
                description: error?.message,
                level: AlertLevels.ERROR,
                message: "Filter query format incorrect"
            }));
        }
    };

    return (
        <>
            {
                openModal
                    ? <AddLocalClaims
                        open={ openModal }
                        onClose={ () => { setOpenModal(false) } }
                        update={ getLocalClaims }
                        claimURIBase={ claimURIBase }
                    />
                    : null
            }
            <PageLayout
                title="Local Attributes"
                description="Create and manage local attributes"
                showBottomDivider={ true }
                backButton={ {
                    onClick: () => { history.push(CLAIM_DIALECTS_PATH) },
                    text: "Go back to attribute dialects"
                } }
            >
                { filteredClaims && filteredClaims.length > 0 ?
                    (
                        <ListLayout
                            advancedSearch={
                                <AdvancedSearchWithBasicFilters
                                    onFilter={ handleLocalClaimsFilter }
                                    filterAttributeOptions={ [
                                        {
                                            key: 0,
                                            text: t("common:name"),
                                            value: "name"
                                        },
                                        {
                                            key: 1,
                                            text: t("common:description"),
                                            value: "description"
                                        }
                                    ] }
                                    filterAttributePlaceholder={
                                        t("devPortal:components.userstores.advancedSearch.form.inputs" +
                                            ".filterAttribute.placeholder")
                                    }
                                    filterConditionsPlaceholder={
                                        t("devPortal:components.userstores.advancedSearch.form.inputs" +
                                            ".filterCondition.placeholder")
                                    }
                                    filterValuePlaceholder={
                                        t("devPortal:components.userstores.advancedSearch.form.inputs" +
                                            ".filterValue.placeholder")
                                    }
                                    placeholder={
                                        t("devPortal:components.userstores.advancedSearch.placeholder")
                                    }
                                    defaultSearchAttribute="name"
                                    defaultSearchOperator="co"
                                />
                            }
                            currentListSize={ listItemLimit }
                            listItemLimit={ listItemLimit }
                            onItemsPerPageDropdownChange={ handleItemsPerPageDropdownChange }
                            onPageChange={ handlePaginationChange }
                            onSortStrategyChange={ handleSortStrategyChange }
                            rightActionPanel={
                                 hasRequiredScopes(
                            featureConfig?.attributeDialects,
                            featureConfig?.attributeDialects?.scopes?.create) && (
                                    <PrimaryButton
                                        onClick={ () => {
                                            setOpenModal(true);
                                        } }
                                    >
                                        <Icon name="add" />New Local Attribute
                                    </PrimaryButton>
                                )
                            }
                            leftActionPanel={ null }
                            showPagination={ true }
                            sortOptions={ SORT_BY }
                            sortStrategy={ sortBy }
                            totalPages={ Math.ceil(filteredClaims?.length / listItemLimit) }
                            totalListSize={ filteredClaims?.length }
                            onSortOrderChange={ handleSortOrderChange }
                        >
                            <ClaimsList
                                list={ paginate(filteredClaims, listItemLimit, offset) }
                                localClaim={ ListType.LOCAL }
                                update={ getLocalClaims }
                            />
                        </ListLayout>
                    )
                    : !isLoading && (
                        <EmptyPlaceholder
                            action={ (
                                <LinkButton onClick={ () => {
                                    setFilteredClaims(claims);
                                } }
                                >
                                    Clear search query
                                </LinkButton>
                            ) }
                            image={ EmptyPlaceholderIllustrations.emptySearch }
                            imageSize="tiny"
                            title={ "No results found" }
                            subtitle={ [
                                `We couldn't find any results for "${query}"`,
                                "Please try a different search term."
                            ] }
                        />
                    )
                }
            </PageLayout>
        </>
    );
};
