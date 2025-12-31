import React from 'react';
import { Grid, Skeleton } from '@mui/material'
import { CloudUpload } from '@mui/icons-material'
import useStyles from './UploadImage.styles'
import { StyledButton } from '../'
import global from '../../global'
import ItemAPI from '../../apis/Item.api'
import { useSnackbar } from 'notistack';

export default function UploadImage(props) {

    const { enqueueSnackbar } = useSnackbar()
    const { imageBase64Js, imagePyBase64Js } = global.methods
    const [loading, setLoading] = React.useState(true)
    const { formik, editMode } = props
    const classes = useStyles()
    const onImageUpload = (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0]
            var fileReader = new FileReader()
            fileReader.onload = function (e) {
                console.log(fileReader.result)
                formik.setFieldValue('image_main', fileReader.result)
            }
            fileReader.readAsDataURL(file)
        }
    }

    console.log(props.itemId)

    const handleImage = React.useCallback(() => {
        ItemAPI.getImageItem(props.itemId)
            .then(res => formik.setFieldValue('image_main', res.data))
            .catch(err => enqueueSnackbar('Failed to load image', { variant: 'error' }))
            .finally(() => setLoading(false))
    }, [])

    React.useEffect(() => editMode ? handleImage() : setLoading(false), [handleImage])

    return (
        <Grid container justifyContent={'center'} alignItems='center' className={classes.root}>
            <Grid item xs={12}>
                {formik.values.image_main ?
                    <>
                        {loading ? <Skeleton variant='rectangle' height={'220px'} width='100%' />
                            :
                            <>
                                <img src={formik.values['image_main']} className={classes.uploadButton} alt='Preview' />
                                <StyledButton
                                    color='error'
                                    className={classes.removeButton}
                                    onClick={() => formik.setFieldValue('image_main', null)}
                                    fullWidth={true}
                                    variant='contained'
                                >
                                    Remove Image
                                </StyledButton>
                            </>
                        }
                    </>
                    :
                    <>
                        <input
                            className={classes.uploadInput}
                            accept='image/*'
                            id='image_main'
                            type='file'
                            name='image_main'
                            onChange={onImageUpload}
                        />
                        <label htmlFor='image_main'>
                            <StyledButton
                                component='span'
                                endIcon={<CloudUpload />}
                                focusRipple
                                className={classes.uploadButton}
                            >
                                Upload Main Image
                            </StyledButton>
                        </label>
                    </>
                }
            </Grid>
        </Grid>
    )

}