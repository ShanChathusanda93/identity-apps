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
import { AlertLevels, SBACInterface, TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { PrimaryButton } from "@wso2is/react-components";
import React, { FunctionComponent, ReactElement, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Divider } from "semantic-ui-react";
import { ScriptBasedFlow } from "./script-based-flow";
import { StepBasedFlow } from "./step-based-flow";
import { updateAuthenticationSequence } from "../../../../api";
import {
    AdaptiveAuthTemplateInterface,
    AuthenticationSequenceInterface,
    AuthenticationStepInterface,
    FeatureConfigInterface
} from "../../../../models";

/**
 * Proptypes for the sign on methods component.
 */
interface SignOnMethodsPropsInterface extends SBACInterface<FeatureConfigInterface>, TestableComponentInterface {
    /**
     * ID of the application.
     */
    appId?: string;
    /**
     * Currently configured authentication sequence for the application.
     */
    authenticationSequence: AuthenticationSequenceInterface;
    /**
     * Is the application info request loading.
     */
    isLoading?: boolean;
    /**
     * Callback to update the application details.
     */
    onUpdate: (id: string) => void;
}

/**
 * Configure the different sign on strategies for an application.
 *
 * @param {SignOnMethodsPropsInterface} props - Props injected to the component.
 *
 * @return {React.ReactElement}
 */
export const SignOnMethods: FunctionComponent<SignOnMethodsPropsInterface> = (
    props: SignOnMethodsPropsInterface
): ReactElement => {

    const {
        appId,
        authenticationSequence,
        featureConfig,
        isLoading,
        onUpdate,
        [ "data-testid" ]: testId
    } = props;

    const dispatch = useDispatch();

    const [ sequence, setSequence ] = useState<AuthenticationSequenceInterface>(authenticationSequence);
    const [ updateTrigger, setUpdateTrigger ] = useState<boolean>(false);
    const [ adaptiveScript, setAdaptiveScript ] = useState<string | string[]>(undefined);

    /**
     * Toggles the update trigger.
     */
    useEffect(() => {
        if (!updateTrigger) {
            return;
        }

        setUpdateTrigger(false);
    }, [ updateTrigger ]);

    /**
     * Handles the data loading from a adaptive auth template when it is selected
     * from the panel.
     *
     * @param {AdaptiveAuthTemplateInterface} template - Adaptive authentication templates.
     */
    const handleLoadingDataFromTemplate = (template: AdaptiveAuthTemplateInterface) => {
        if (!template) {
            return;
        }

        let newSequence = { ...sequence };

        if (template.code) {
            newSequence = {
                ...newSequence,
                script: JSON.stringify(template.code)
            }
        }

        if (template.defaultAuthenticators) {
            const steps: AuthenticationStepInterface[] = [];

            for (const [ key, value ] of Object.entries(template.defaultAuthenticators)) {
                steps.push({
                    id: parseInt(key, 10),
                    options: value.local.map((authenticator) => {
                        return {
                            authenticator,
                            idp: "LOCAL"
                        }
                    })
                })
            }

            newSequence = {
                ...newSequence,
                attributeStepId: 1,
                steps,
                subjectStepId: 1
            }
        }

        setSequence(newSequence);
    };

    /**
     * Handles authentication sequence update.
     */
    const handleSequenceUpdate = (sequence: AuthenticationSequenceInterface) => {
        const requestBody = {
            authenticationSequence: {
                ...sequence,
                script: JSON.stringify(adaptiveScript)
            }
        };

        updateAuthenticationSequence(appId, requestBody)
            .then(() => {
                dispatch(addAlert({
                    description: "Successfully updated the application",
                    level: AlertLevels.SUCCESS,
                    message: "Update successful"
                }));

                onUpdate(appId);
            })
            .catch((error) => {
                if (error.response && error.response.data && error.response.data.description) {
                    dispatch(addAlert({
                        description: error.response.data.description,
                        level: AlertLevels.ERROR,
                        message: "Update Error"
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: "An error occurred while updating authentication steps of the application",
                    level: AlertLevels.ERROR,
                    message: "Update Error"
                }));
            });
    };

    /**
     * Handles adaptive script change event.
     *
     * @param {string | string[]} script - Adaptive script from the editor.
     */
    const handleAdaptiveScriptChange = (script: string | string[]) => {
        setAdaptiveScript(script);
    };

    /**
     * Handles the update button click event.
     */
    const handleUpdateClick = () => {
        setUpdateTrigger(true);
    };

    return (
        <div className="sign-on-methods-tab-content">
            <StepBasedFlow
                authenticationSequence={ sequence }
                isLoading={ isLoading }
                onUpdate={ handleSequenceUpdate }
                triggerUpdate={ updateTrigger }
                readOnly={
                    !hasRequiredScopes(featureConfig?.applications, featureConfig?.applications?.scopes?.update)
                }
                data-testid={ `${ testId }-step-based-flow` }
            />
            <Divider hidden />
            <ScriptBasedFlow
                authenticationSequence={ sequence }
                isLoading={ isLoading }
                onTemplateSelect={ handleLoadingDataFromTemplate }
                onScriptChange={ handleAdaptiveScriptChange }
                readOnly={
                    !hasRequiredScopes(featureConfig?.applications, featureConfig?.applications?.scopes?.update)
                }
                data-testid={ `${ testId }-script-based-flow` }
            />
            <Divider hidden/>
            {
                hasRequiredScopes(featureConfig?.applications, featureConfig?.applications?.scopes?.update) && (
                    <PrimaryButton
                        onClick={ handleUpdateClick }
                        data-testid={ `${ testId }-update-button` }
                    >
                        Update
                    </PrimaryButton>
                )
            }
        </div>
    );
};

/**
 * Default props for the application sign-on-methods component.
 */
SignOnMethods.defaultProps = {
    "data-testid": "sign-on-methods"
};