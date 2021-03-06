/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

import React, { forwardRef, useEffect, useState } from "react";
import { Form } from "semantic-ui-react";
import { Field, GroupFields, InnerField, InnerGroupFields } from "./components";
import { isCheckBoxField, isDropdownField, isInputField, isRadioField, isTextField } from "./helpers";
import { Error, FormField, FormValue, Validation } from "./models";
import { useNonInitialEffect } from "./utils";

/**
 * Component ref type.
 */
type Ref = HTMLFormElement;

/**
 * Prop types for Form component
 */
interface FormPropsInterface {
    onSubmit: (values: Map<string, FormValue>) => void;
    onChange?: (isPure: boolean, values: Map<string, FormValue>) => void;
    resetState?: boolean;
    submitState?: boolean;
}

/**
 * This is a Forms component
 */
export const Forms: React.FunctionComponent<React.PropsWithChildren<FormPropsInterface>> =
    (props): JSX.Element => {

    const { onSubmit, resetState, submitState, onChange, children } = props;

    // This holds the values of the form fields
    const [form, setForm] = useState(new Map<string, FormValue>());

    // This specifies if any of the fields in the form has been touched or not
    const [isPure, setIsPure] = useState(true);

    // This specifies if a field's value is valid or not
    const [validFields, setValidFields] = useState(new Map<string, Validation>());

    // This specifies if a field has been touched or not
    const [touchedFields, setTouchedFields] = useState(new Map<string, boolean>());

    // This specifies if the required fields are  filled or not
    const [requiredFields, setRequiredFields] = useState(new Map<string, boolean>());

    // This specifies if the `Submit` method has been called or not
    const [isSubmitting, setIsSubmitting] = useState(false);

    // This holds all the form field components
    const formFields: FormField[] = [];
    const flatReactChildren: React.ReactElement[] = [];

    // The lock to be used by `initMutex`
    let locked = false;

    /**
     * Handler for the onChange event
     * @param value
     * @param name
     */
    const handleChange = (value: string, name: string) => {
        const tempForm: Map<string, FormValue> = new Map(form);
        const tempTouchedFields: Map<string, boolean> = new Map(touchedFields);

        tempForm.set(name, value);
        tempTouchedFields.set(name, true);
        listener(name, tempForm);
        propagateOnChange(tempForm);
        setForm(tempForm);
        setIsPure(false);
        setTouchedFields(tempTouchedFields);
    };

    /**
     * Handler for the onChange event of checkboxes
     * @param value
     * @param name
     */
    const handleChangeCheckBox = (value: string, name: string) => {
        const tempForm: Map<string, FormValue> = new Map(form);
        const selectedItems: string[] = tempForm.get(name) as string[];
        const tempTouchedFields: Map<string, boolean> = new Map(touchedFields);

        let itemIndex = -1;
        selectedItems.forEach((item, index) => {
            if (item === value) {
                itemIndex = index;
            }
        });
        itemIndex === -1 ? selectedItems.push(value) : selectedItems.splice(itemIndex, 1);

        tempForm.set(name, selectedItems);
        tempTouchedFields.set(name, true);
        listener(name, tempForm);
        propagateOnChange(tempForm);
        setForm(tempForm);
        setIsPure(false);
        setTouchedFields(tempTouchedFields);
    };

    /**
     * Handler for the onBlur event
     * @param event
     * @param name
     */
    const handleBlur = (event: React.KeyboardEvent, name: string) => {
        const tempRequiredFields: Map<string, boolean> = new Map(requiredFields);
        const tempValidFields: Map<string, Validation> = new Map(validFields);

        validate(name, tempRequiredFields, tempValidFields);

        setValidFields(tempValidFields);
        setRequiredFields(tempRequiredFields);
    };

    /**
     * Handles reset button click
     * @param event
     */
    const handleReset = (event: React.MouseEvent) => {
        event.preventDefault();
        reset();
        locked = false;
    };

    /**
     * Handler for onSubmit event
     * @param {React.FormEvent} event
     */
    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        submit();
    };

    /**
     * Resets form
     */
    const reset = () => {
        setIsSubmitting(false);
        initMutex(true);
    };

    /**
     * This is a mutex that wraps the `init` function.
     * This prevents `init` from being called twice when reset is triggered.
     * @param {boolean} lock A boolean value that specifies if the mutex should be locked or not
     */
    const initMutex = (lock: boolean) => {
        if (locked) {
            locked = false;
        } else {
            if (lock) {
                locked = true;
                init(true);
            } else {
                init(false);
            }
        }
    };
    /**
     * This validates the form and calls the `onSubmit` prop function
     */
    const submit = () => {
        if (checkRequiredFieldsFilled() && checkValidated()) {
            setIsSubmitting(false);
            onSubmit(form);
        } else {
            setIsSubmitting(true);
        }
    };

    /**
     * This function calls the listener prop of the field that is calling the `handleChange` function
     * @param name
     * @param newForm
     */
    const listener = (name: string, newForm: Map<string, FormValue>) => {
        React.Children.map(flatReactChildren, (element: React.ReactElement) => {
            if (
                element.props.name
                && element.props.name === name
                && element.props.listen
                && typeof element.props.listen === "function"
            ) {
                element.props.listen(newForm);
            }
        });
    };

    /**
     * Checks if all the required fields are filled
     */
    const checkRequiredFieldsFilled = (): boolean => {
        let requiredFilled: boolean = true;
        requiredFields.forEach((requiredFieldParam) => {
            if (!requiredFieldParam) {
                requiredFilled = false;
            }
        });
        return requiredFilled;
    };

    /**
     * Checks if all the fields are validated
     */
    const checkValidated = (): boolean => {
        let isValidated: boolean = true;
        validFields.forEach((validField) => {
            if (!validField.isValid) {
                isValidated = false;
            }
        });
        return isValidated;
    };

    /**
     * Checks if the field has any errors (required but not filled | not validated)
     * @param inputField
     */
    const checkError = (inputField: FormField): Error => {
        if (isInputField(inputField)
            && !isRadioField(inputField)
            && inputField.required
            && !requiredFields.get(inputField.name)
            && isSubmitting) {
            return {
                errorMessages: [inputField.requiredErrorMessage],
                isError: true
            };
        } else if (
            isTextField(inputField) &&
            validFields.get(inputField.name) &&
            !validFields.get(inputField.name).isValid &&
            isSubmitting
        ) {
            return {
                errorMessages: validFields.get(inputField.name).errorMessages,
                isError: true
            };
        } else {
            return {
                errorMessages: [],
                isError: false
            };
        }
    };

    /**
     * Calls submit when submit is triggered externally
     */
    useNonInitialEffect(() => {
        submit();
    }, [submitState]);

    /**
     * Calls reset when reset is triggered externally
     */
    useNonInitialEffect(() => {
        reset();
    }, [resetState]);

    /**
     * Initializes the state of the from every time the passed formFields prop changes
     */
    useEffect(() => {
        initMutex(false);
    }, [children]);

    /**
     * Calls the onChange prop
     */
    const propagateOnChange = (formValue: Map<string, FormValue>) => {
        if (onChange && typeof onChange === "function") {
            onChange(isPure, formValue);
        }
    };

    /**
     * Parses the children and
     * 1.passes form event handler functions as props to all the Field components
     * 2.extracts the props of the Field components
     * @param elements
     * @param fields
     */
    const parseChildren = (elements: React.ReactNode, fields: FormField[]): React.ReactElement[] => {
        return React.Children.map(elements, (element: React.ReactElement) => {
            if (element) {
                if (element.type === Field) {
                    fields.push(element.props);
                    flatReactChildren.push(element);
                    return React.createElement(InnerField, {
                        formProps: {
                            checkError,
                            form,
                            handleBlur,
                            handleChange,
                            handleChangeCheckBox,
                            handleReset
                        },
                        passedProps: { ...element.props }
                    });
                } else if (element.type === GroupFields) {
                    return React.createElement(InnerGroupFields, {
                        ...element.props,
                        children: parseChildren(element.props.children, fields)
                    });
                } else if (element.props
                    && element.props.children
                    && React.Children.count(element.props.children) > 0) {
                    return React.createElement(element.type, {
                        ...element.props,
                        children: parseChildren(element.props.children, fields)
                    });
                } else {
                    return element;
                }
            }
        });
    };

    /**
     * Initialize form
     * @param {boolean} isReset
     */
    const init = (isReset: boolean) => {
        const tempForm: Map<string, FormValue> = new Map(form);
        const tempRequiredFields: Map<string, boolean> = new Map(requiredFields);
        const tempValidFields: Map<string, Validation> = new Map(validFields);
        const tempTouchedFields: Map<string, boolean> = new Map(touchedFields);

        formFields.forEach((inputField: FormField) => {
            /**
             * Check if the element is an input element(an element that can hold a value)
             *      -> Then:
             *          Check if the field has not been touched OR the reset button has been pressed
             *          -> Then:
             *              Check if the element has a value and the reset button has not been clicked
             *                  -> Then:
             *                      Set the value of the element to the corresponding key in the FormValue map
             *                  -> Else:
             *                      Check if the element is a (radio OR Dropdown) AND it has a default value
             *                          -> Then:
             *                              Assign the default value to the corresponding FormValue key
             *                          -> Else:
             *                              Check if the the element is checkbox
             *                                  -> Then:
             *                                      Assign an empty array to the corresponding FormValue key
             *                                  -> Else:
             *                                      Assign an empty string value to the corresponding FormValue key
             */
            if (isInputField(inputField)) {
                if (!touchedFields.get(inputField.name) || isReset) {
                    inputField.value && !isReset
                        ? tempForm.set(inputField.name, inputField.value)
                        : (isRadioField(inputField) || isDropdownField(inputField)) && inputField.default
                            ? tempForm.set(inputField.name, inputField.default)
                            : isCheckBoxField(inputField)
                                ? tempForm.set(inputField.name, [])
                                : tempForm.set(inputField.name, "");
                }

                /**
                 * {
                 *      {
                 *          Check if the field value is not empty AND
                 *          (the field doesn't already exist/the value is empty OR the array's length is 0 )
                 *      } OR
                 *      the reset button has been clicked
                 * } AND
                 *          it is not a radio field AND
                 *          the field is not required
                 *
                 * Then: Set required to false
                 * Else: Set required to true
                 *
                 */
                (
                    (
                        !inputField.value
                        && (!tempForm.get(inputField.name) || !(tempForm.get(inputField.name).length > 0))
                    )
                    || isReset
                )
                    && (!isRadioField(inputField) && inputField.required)
                    ? tempRequiredFields.set(inputField.name, false)
                    : tempRequiredFields.set(inputField.name, true);

                if (!tempValidFields.has(inputField.name) || isReset) {
                    tempValidFields.set(inputField.name, { isValid: true, errorMessages: [] });
                    tempTouchedFields.set(inputField.name, false);
                }
            }
        });

        if (!isReset) {
            setRequiredFields(tempRequiredFields);
            setTouchedFields(tempTouchedFields);
        }
        setForm(tempForm);
        setValidFields(tempValidFields);
    };

    /**
     * This function checks if a form field is valid
     * @param name
     * @param requiredFieldsParam
     * @param validFieldsParam
     */
    const validate = (
        name: string,
        requiredFieldsParam: Map<string, boolean>,
        validFieldsParam: Map<string, Validation>
    ) => {
        const inputField: FormField = formFields.find((formField) => {
            return isInputField(formField) && formField.name === name;
        });

        if (isInputField(inputField) && !isRadioField(inputField) && inputField.required) {
            if (!isCheckBoxField(inputField)) {
                form.get(name) !== null && form.get(name) !== ""
                    ? requiredFieldsParam.set(name, true)
                    : requiredFieldsParam.set(name, false);
            } else {
                form.get(name) !== null && form.get(name).length > 0
                    ? requiredFieldsParam.set(name, true)
                    : requiredFieldsParam.set(name, false);
            }
        }

        const validation: Validation = {
            errorMessages: [],
            isValid: true
        };

        if (
            isTextField(inputField)
            && inputField.validation
            && !(form.get(name) === null || form.get(name) === "")
        ) {
            inputField.validation(form.get(name) as string, validation, new Map(form));
        }

        validFieldsParam.set(name, {
            errorMessages: validation.errorMessages,
            isValid: validation.isValid
        });
    };

    const mutatedChildren: React.ReactElement[] = [...parseChildren(children, formFields)];

    return <Form onSubmit={ handleSubmit }>{ mutatedChildren }</Form>;
};

Forms.defaultProps = {
    resetState: false,
    submitState: false
};
